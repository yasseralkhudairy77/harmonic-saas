import { API_BASE_URL } from "./config.js";

var DEFAULT_REFRESH_SECONDS = 30;
var SLOW_REQUEST_NOTICE_MS = 12000;
var FETCH_HARD_TIMEOUT_MS = 70000;
var EXPIRED_RESYNC_SECONDS = 5;
var MISSING_CONFIG_MESSAGE = "Display belum dikonfigurasi. Silakan hubungi kasir.";
var RECONNECT_MESSAGE = "Sedang memperbarui tampilan...";
var IDLE_STATUS = "Ruangan tersedia";
var ACTIVE_STATUS = "Sesi karaoke aktif";
var FALLBACK_ROOM_NAME = "Karaoke Room";

var queryParams = new URLSearchParams(window.location.search);
var roomId = String(queryParams.get("room_id") || "").trim();
var token = String(queryParams.get("token") || "").trim();
var elements = {};
var currentState = null;
var pollTimerId = null;
var countdownTimerId = null;
var expiredResyncTimerId = null;
var latestRequestId = 0;
var hasWarnedFetchFailure = false;
var isReconnecting = false;

document.addEventListener("DOMContentLoaded", initKaraokeMode);
window.addEventListener("beforeunload", clearTimers);

function initKaraokeMode() {
  elements = {
    root: document.getElementById("karaokeRoot"),
    statusLabel: document.getElementById("statusLabel"),
    roomName: document.getElementById("roomName"),
    timerText: document.getElementById("timerText"),
    noticeText: document.getElementById("noticeText"),
  };

  renderLoading();

  if (!roomId || !token) {
    renderSafeMessage(MISSING_CONFIG_MESSAGE, "idle");
    return;
  }

  if (!String(API_BASE_URL || "").trim()) {
    renderSafeMessage(RECONNECT_MESSAGE, "reconnecting");
    return;
  }

  startCountdownTimer();
  fetchDisplayState();
}

function postDisplayAction(payload) {
  var abortController = typeof AbortController === "function" ? new AbortController() : null;
  var hasCompleted = false;
  var hardTimeoutTimerId = null;
  var slowNoticeTimerId = window.setTimeout(function () {
    if (!hasCompleted) {
      renderReconnect();
    }
  }, SLOW_REQUEST_NOTICE_MS);
  var requestOptions = {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  };

  if (abortController) {
    requestOptions.signal = abortController.signal;
  }

  var request = fetch(API_BASE_URL, requestOptions).then(function (response) {
    return response.json();
  });

  var timeout = new Promise(function (_, reject) {
    hardTimeoutTimerId = window.setTimeout(function () {
      if (!hasCompleted && abortController) {
        abortController.abort();
      }

      reject(new Error("Karaoke display request timed out."));
    }, FETCH_HARD_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]).finally(function () {
    hasCompleted = true;
    window.clearTimeout(slowNoticeTimerId);
    window.clearTimeout(hardTimeoutTimerId);
  });
}

function fetchDisplayState() {
  clearPollTimer();

  var requestId = latestRequestId + 1;
  latestRequestId = requestId;

  postDisplayAction({
    action: "getCustomerDisplayState",
    room_id: roomId,
    token: token,
  })
    .then(function (data) {
      if (requestId !== latestRequestId) {
        return;
      }

      if (!data || data.success === false || data.ok === false) {
        handleBackendError(data);
        scheduleNextPoll(DEFAULT_REFRESH_SECONDS);
        return;
      }

      hasWarnedFetchFailure = false;
      isReconnecting = false;
      clearExpiredResyncTimer();
      applyDisplayState(data);
      scheduleNextPoll(getRefreshIntervalSeconds(data));
    })
    .catch(function (error) {
      if (requestId !== latestRequestId) {
        return;
      }

      if (!hasWarnedFetchFailure) {
        console.warn("Karaoke display update delayed.", getSafeErrorName(error));
        hasWarnedFetchFailure = true;
      }

      renderReconnect();
      scheduleNextPoll(DEFAULT_REFRESH_SECONDS);
    });
}

function applyDisplayState(data) {
  var normalized = normalizeDisplayState(data);
  var nowMs = Date.now();

  currentState = {
    roomName: normalized.roomName,
    hasActiveSession: normalized.hasActiveSession,
    remainingSeconds: normalized.remainingSeconds,
    warningLevel: normalized.warningLevel,
    message: normalized.message,
    receivedAtMs: nowMs,
  };

  renderState();
}

function normalizeDisplayState(data) {
  var room = data.room || {};
  var session = data.session || {};
  var display = data.display || {};
  var hasActiveSession =
    data.has_active_session === true ||
    session.has_active_session === true ||
    data.hasActiveSession === true;
  var remainingSeconds = readNumber(data.remaining_seconds, session.remaining_seconds, 0);
  var roomName = firstText(data.room_name, room.room_name, room.room_id, FALLBACK_ROOM_NAME);
  var warningLevel = firstText(data.warning_level, session.warning_level, "idle");
  var message = firstText(data.message, display.message, "");

  return {
    roomName: roomName,
    hasActiveSession: hasActiveSession,
    remainingSeconds: Math.max(0, Math.floor(remainingSeconds)),
    warningLevel: warningLevel,
    message: message,
  };
}

function renderState() {
  if (!currentState) {
    return;
  }

  setText(elements.roomName, currentState.roomName || FALLBACK_ROOM_NAME);
  setText(elements.noticeText, "");

  if (!currentState.hasActiveSession) {
    setTone("idle");
    setText(elements.statusLabel, IDLE_STATUS);
    setText(elements.timerText, "00:00:00");
    setText(elements.noticeText, currentState.message);
    return;
  }

  setText(elements.statusLabel, ACTIVE_STATUS);
  setText(elements.noticeText, currentState.message);
  renderCountdown();
}

function renderCountdown() {
  if (!currentState || currentState.hasActiveSession !== true) {
    return;
  }

  var elapsedSeconds = Math.floor((Date.now() - currentState.receivedAtMs) / 1000);
  var remainingSeconds = Math.max(0, currentState.remainingSeconds - elapsedSeconds);
  var tone = normalizeTone(currentState.warningLevel, remainingSeconds);

  setText(elements.timerText, formatTimer(remainingSeconds));

  if (!isReconnecting) {
    setTone(tone);
  }

  if (remainingSeconds <= 0) {
    scheduleExpiredResync();
  }
}

function handleBackendError(data) {
  var errorCode = data && (data.error || data.code);
  var messageMap = {
    INVALID_DISPLAY_TOKEN: "Display tidak valid. Silakan hubungi kasir.",
    DISPLAY_DISABLED: "Display room sedang nonaktif. Silakan hubungi kasir.",
    DISPLAY_NOT_FOUND: "Display belum terdaftar. Silakan hubungi kasir.",
  };
  var message = messageMap[errorCode] || RECONNECT_MESSAGE;
  isReconnecting = true;

  if (currentState) {
    setTone("reconnecting");
    setText(elements.noticeText, message);
    return;
  }

  renderSafeMessage(message, errorCode ? "idle" : "reconnecting");
}

function renderLoading() {
  setTone("loading");
  setText(elements.statusLabel, "Sedang menyiapkan display...");
  setText(elements.roomName, FALLBACK_ROOM_NAME);
  setText(elements.timerText, "00:00:00");
  setText(elements.noticeText, "");
}

function renderReconnect() {
  isReconnecting = true;

  if (currentState) {
    setTone("reconnecting");
    setText(elements.noticeText, RECONNECT_MESSAGE);
    return;
  }

  renderSafeMessage(RECONNECT_MESSAGE, "reconnecting");
}

function renderSafeMessage(message, tone) {
  setTone(tone || "idle");
  setText(elements.statusLabel, message);
  setText(elements.roomName, FALLBACK_ROOM_NAME);
  setText(elements.timerText, "00:00:00");
  setText(elements.noticeText, "");
}

function startCountdownTimer() {
  clearCountdownTimer();
  countdownTimerId = window.setInterval(renderCountdown, 1000);
}

function scheduleNextPoll(seconds) {
  clearPollTimer();
  pollTimerId = window.setTimeout(fetchDisplayState, Math.max(5, Number(seconds) || DEFAULT_REFRESH_SECONDS) * 1000);
}

function scheduleExpiredResync() {
  if (expiredResyncTimerId) {
    return;
  }

  expiredResyncTimerId = window.setTimeout(function () {
    expiredResyncTimerId = null;
    fetchDisplayState();
  }, EXPIRED_RESYNC_SECONDS * 1000);
}

function getRefreshIntervalSeconds(data) {
  var topLevelInterval = Number(data.refresh_interval_seconds);
  var displayInterval = Number(data.display && data.display.refresh_interval_seconds);

  if (isFinite(topLevelInterval) && topLevelInterval > 0) {
    return topLevelInterval;
  }

  if (isFinite(displayInterval) && displayInterval > 0) {
    return displayInterval;
  }

  return DEFAULT_REFRESH_SECONDS;
}

function clearTimers() {
  clearPollTimer();
  clearCountdownTimer();
  clearExpiredResyncTimer();
}

function clearPollTimer() {
  if (pollTimerId) {
    window.clearTimeout(pollTimerId);
    pollTimerId = null;
  }
}

function clearCountdownTimer() {
  if (countdownTimerId) {
    window.clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
}

function clearExpiredResyncTimer() {
  if (expiredResyncTimerId) {
    window.clearTimeout(expiredResyncTimerId);
    expiredResyncTimerId = null;
  }
}

function normalizeTone(warningLevel, remainingSeconds) {
  var level = String(warningLevel || "").toLowerCase();

  if (level === "idle") {
    return "idle";
  }

  if (level === "expired" || remainingSeconds <= 0) {
    return "expired";
  }

  if (level.indexOf("warning") === 0 || remainingSeconds <= 600) {
    return "warning";
  }

  return "normal";
}

function readNumber() {
  for (var index = 0; index < arguments.length; index += 1) {
    var value = Number(arguments[index]);

    if (isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function firstText() {
  for (var index = 0; index < arguments.length; index += 1) {
    var value = String(arguments[index] || "").trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function getSafeErrorName(error) {
  return error && error.name ? error.name : "FetchError";
}

function setTone(tone) {
  if (elements.root) {
    elements.root.className = "karaoke-mode " + tone;
  }
}

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function formatTimer(totalSeconds) {
  var safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  var hours = Math.floor(safeSeconds / 3600);
  var minutes = Math.floor((safeSeconds % 3600) / 60);
  var seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map(padTwo).join(":");
}

function padTwo(value) {
  return String(value).padStart(2, "0");
}
