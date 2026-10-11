import { API_BASE_URL } from "./config.js";

var SETUP_ACTION = "getTvDisplaySetupList";
var TV_DISPLAY_BASE = "https://karaoke-management-system.netlify.app/tv-display.html";
var MISSING_CONFIG_MESSAGE = "Launcher belum dikonfigurasi. Silakan cek config.js.";
var LOAD_ERROR_MESSAGE = "Daftar room belum bisa dimuat. Coba muat ulang.";
var EMPTY_MESSAGE = "Belum ada display room yang tersedia.";

var elements = {};
var displayRooms = [];

document.addEventListener("DOMContentLoaded", initLauncher);

function initLauncher() {
  elements = {
    root: document.getElementById("launcherRoot"),
    statusText: document.getElementById("statusText"),
    roomGrid: document.getElementById("roomGrid"),
    reloadButton: document.getElementById("reloadButton"),
  };

  if (elements.reloadButton) {
    elements.reloadButton.addEventListener("click", loadSetupList);
  }

  if (elements.roomGrid) {
    elements.roomGrid.addEventListener("keydown", handleRoomGridKeydown);
  }

  loadSetupList();
}

function loadSetupList() {
  setError(false);
  setStatus("Memuat daftar room...");
  clearRooms();

  if (!String(API_BASE_URL || "").trim()) {
    renderEmpty(MISSING_CONFIG_MESSAGE);
    setError(true);
    return;
  }

  postSetupAction()
    .then(function (data) {
      if (!data || data.success === false || data.ok === false) {
        renderEmpty(LOAD_ERROR_MESSAGE);
        setError(true);
        return;
      }

      displayRooms = normalizeDisplays(data);
      renderRooms(displayRooms);
    })
    .catch(function (error) {
      console.warn("Launcher setup list request failed.", getSafeErrorName(error));
      renderEmpty(LOAD_ERROR_MESSAGE);
      setError(true);
    });
}

function postSetupAction() {
  return fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: SETUP_ACTION }),
  }).then(function (response) {
    return response.json();
  });
}

function normalizeDisplays(data) {
  var source = [];

  if (Array.isArray(data.displays)) {
    source = data.displays;
  } else if (data.display && Array.isArray(data.display.displays)) {
    source = data.display.displays;
  } else if (data.data && Array.isArray(data.data.displays)) {
    source = data.data.displays;
  }

  return source
    .map(function (item) {
      return {
        roomId: String(item && item.room_id ? item.room_id : "").trim(),
        roomName: String(item && item.room_name ? item.room_name : "").trim(),
        token: String(item && item.token ? item.token : "").trim(),
      };
    })
    .filter(function (item) {
      return item.roomId && item.token;
    });
}

function renderRooms(rooms) {
  clearRooms();

  if (!rooms.length) {
    renderEmpty(EMPTY_MESSAGE);
    return;
  }

  setStatus("Pilih room untuk membuka display TV. Bookmark halaman display setelah terbuka.");

  rooms.forEach(function (room, index) {
    var button = document.createElement("button");
    var label = document.createElement("span");

    button.className = "room-button";
    button.type = "button";
    button.tabIndex = 0;
    button.setAttribute("data-room-index", String(index));
    label.className = "room-label";
    label.textContent = formatRoomLabel(room);

    button.appendChild(label);
    button.addEventListener("click", function () {
      openDisplay(room);
    });

    elements.roomGrid.appendChild(button);
  });
}

function openDisplay(room) {
  var targetUrl =
    TV_DISPLAY_BASE +
    "?room_id=" +
    encodeURIComponent(room.roomId) +
    "&token=" +
    encodeURIComponent(room.token) +
    "&v=launcher";

  window.location.href = targetUrl;
}

function handleRoomGridKeydown(event) {
  var keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];

  if (keys.indexOf(event.key) === -1) {
    return;
  }

  var buttons = Array.prototype.slice.call(elements.roomGrid.querySelectorAll(".room-button"));
  var currentIndex = buttons.indexOf(document.activeElement);

  if (currentIndex === -1) {
    return;
  }

  event.preventDefault();
  focusRoomButton(buttons, currentIndex, event.key);
}

function focusRoomButton(buttons, currentIndex, key) {
  var columns = getGridColumnCount(buttons);
  var nextIndex = currentIndex;

  if (key === "ArrowRight") {
    nextIndex = currentIndex + 1;
  } else if (key === "ArrowLeft") {
    nextIndex = currentIndex - 1;
  } else if (key === "ArrowDown") {
    nextIndex = currentIndex + columns;
  } else if (key === "ArrowUp") {
    nextIndex = currentIndex - columns;
  }

  if (nextIndex >= 0 && nextIndex < buttons.length) {
    buttons[nextIndex].focus();
  }
}

function getGridColumnCount(buttons) {
  if (!buttons.length) {
    return 1;
  }

  var firstTop = buttons[0].offsetTop;
  var columns = buttons.filter(function (button) {
    return button.offsetTop === firstTop;
  }).length;

  return Math.max(1, columns);
}

function formatRoomLabel(room) {
  if (room.roomName) {
    return room.roomId + " - " + room.roomName;
  }

  return room.roomId;
}

function renderEmpty(message) {
  clearRooms();
  setStatus(message);

  var emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  elements.roomGrid.appendChild(emptyState);
}

function clearRooms() {
  if (elements.roomGrid) {
    elements.roomGrid.textContent = "";
  }
}

function setStatus(message) {
  if (elements.statusText) {
    elements.statusText.textContent = message;
  }
}

function setError(hasError) {
  if (!elements.root) {
    return;
  }

  elements.root.className = hasError ? "launcher error" : "launcher";
}

function getSafeErrorName(error) {
  return error && error.name ? error.name : "FetchError";
}
