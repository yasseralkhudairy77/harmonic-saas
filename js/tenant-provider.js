/**
 * HARMONIC NIGHTLIFE SYSTEM - TENANT CONFIGURATION & WHITE-LABEL ENGINE
 * Module: TenantProvider
 * 
 * Provides tenant discovery, profile resolution, dynamic CSS theme injection,
 * and feature toggles (e.g. Lady Companion, Split Print, Unit Terminology).
 */

(function (global) {
  "use strict";

  const STORAGE_KEY = "harmonic_tenant_slug";

  // Pre-configured Tenant Profiles for default installation and multi-tenant demos
  const PROFILES = {
    default: {
      tenant_id: "harmonic-default",
      slug: "default",
      name: "Harmonic Nightlife Management System",
      short_name: "Harmonic",
      tagline: "Nightlife Management System",
      description: "Precision management for nightlife, lounge, and karaoke operations.",
      branding: {
        logo_header_url: "assets/brand/harmonic-logo-header.png",
        logo_login_url: "assets/brand/harmonic-logo-header.png",
        login_hero_url: "assets/brand/harmonic-login-hero.jpg",
        theme: {
          accent_color: "#e2b85c",
          accent_hover: "#f5c86c",
          accent_glow: "rgba(226, 184, 92, 0.28)",
          bg_dark: "#08090c",
          card_bg: "#111317",
          border_subtle: "rgba(255, 255, 255, 0.08)",
          text_primary: "#ffffff",
          text_secondary: "rgba(255, 255, 255, 0.72)"
        }
      },
      operational: {
        timezone: "Asia/Jakarta",
        cutoff_hour: 10,
        currency_symbol: "Rp",
        tax_pb1_percent: 10.0,
        service_charge_percent: 5.0,
        pricing_mode: "plus_plus",
        grace_period_minutes: 10
      },
      modules: {
        lady_companion: true,
        tv_hardware_bridge: true,
        kitchen_bar_split_print: false,
        inventory_tracking: true
      },
      terminology: {
        unit_label: "Ruangan",
        unit_plural: "Ruangan",
        unit_prefix: "Room"
      }
    },

    "golden-ktv": {
      tenant_id: "golden-ktv-jakarta",
      slug: "golden-ktv",
      name: "Golden Executive KTV",
      short_name: "Golden KTV",
      tagline: "Executive Karaoke & Private Lounge",
      description: "Sistem reservasi dan billing ruang karaoke eksekutif terpadu.",
      branding: {
        logo_header_url: "assets/brand/harmonic-logo-header.png",
        logo_login_url: "assets/brand/harmonic-logo-header.png",
        login_hero_url: "assets/brand/harmonic-login-hero.jpg",
        theme: {
          accent_color: "#f59e0b",
          accent_hover: "#fbbf24",
          accent_glow: "rgba(245, 158, 11, 0.35)",
          bg_dark: "#0b0c10",
          card_bg: "#12141c",
          border_subtle: "rgba(245, 158, 11, 0.15)",
          text_primary: "#ffffff",
          text_secondary: "rgba(255, 255, 255, 0.75)"
        }
      },
      operational: {
        timezone: "Asia/Jakarta",
        cutoff_hour: 8,
        currency_symbol: "Rp",
        tax_pb1_percent: 12.5,
        service_charge_percent: 7.0,
        pricing_mode: "plus_plus",
        grace_period_minutes: 15
      },
      modules: {
        lady_companion: true,
        tv_hardware_bridge: true,
        kitchen_bar_split_print: true,
        inventory_tracking: true
      },
      terminology: {
        unit_label: "Room",
        unit_plural: "Rooms",
        unit_prefix: "VIP"
      }
    },

    "vortex-lounge": {
      tenant_id: "vortex-lounge-bar",
      slug: "vortex-lounge",
      name: "Vortex Lounge & Bar",
      short_name: "Vortex Lounge",
      tagline: "Cocktail Bar & Music Lounge",
      description: "Manajemen reservasi meja, bottle service, dan pesanan F&B bar.",
      branding: {
        logo_header_url: "assets/brand/harmonic-logo-header.png",
        logo_login_url: "assets/brand/harmonic-logo-header.png",
        login_hero_url: "assets/brand/harmonic-login-hero.jpg",
        theme: {
          accent_color: "#06b6d4",
          accent_hover: "#22d3ee",
          accent_glow: "rgba(6, 182, 212, 0.35)",
          bg_dark: "#06090f",
          card_bg: "#0c121d",
          border_subtle: "rgba(6, 182, 212, 0.18)",
          text_primary: "#ffffff",
          text_secondary: "rgba(255, 255, 255, 0.7)"
        }
      },
      operational: {
        timezone: "Asia/Makassar",
        cutoff_hour: 6,
        currency_symbol: "Rp",
        tax_pb1_percent: 10.0,
        service_charge_percent: 5.0,
        pricing_mode: "nett",
        grace_period_minutes: 0
      },
      modules: {
        lady_companion: false,
        tv_hardware_bridge: false,
        kitchen_bar_split_print: true,
        inventory_tracking: true
      },
      terminology: {
        unit_label: "Meja",
        unit_plural: "Meja",
        unit_prefix: "Table"
      }
    }
  };

  let activeProfile = PROFILES.default;

  function resolveTenantSlug() {
    // 1. Query parameter override (e.g. ?tenant=golden-ktv or ?tenant=vortex-lounge)
    try {
      if (typeof window !== "undefined" && window.location) {
        const params = new URLSearchParams(window.location.search);
        const urlSlug = params.get("tenant") || params.get("venue");
        if (urlSlug) {
          const clean = urlSlug.toLowerCase().trim();
          if (clean) return clean;
        }
      }
    } catch (_) {}

    // 2. Local storage override
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const clean = stored.toLowerCase().trim();
          if (clean) return clean;
        }
      }
    } catch (_) {}

    // 3. Subdomain extraction (e.g. golden-ktv.harmonicpos.com or golden-ktv.up.railway.app)
    try {
      if (typeof window !== "undefined" && window.location && window.location.hostname) {
        const host = window.location.hostname;
        const parts = host.split(".");
        if (parts.length >= 3) {
          const sub = parts[0].toLowerCase();
          const technicalSubdomains = ["www", "app", "api", "admin", "dev", "staging", "harmonic-web-production"];
          if (!technicalSubdomains.includes(sub)) {
            return sub;
          }
        }
      }
    } catch (_) {}

    return "default";
  }

  function applyThemeVariables(theme) {
    if (!theme || typeof document === "undefined") return;

    const root = document.documentElement;
    if (theme.accent_color) {
      root.style.setProperty("--tenant-accent", theme.accent_color);
      root.style.setProperty("--tenant-accent-glow", theme.accent_glow || "rgba(226, 184, 92, 0.25)");
    }
    if (theme.accent_hover) {
      root.style.setProperty("--tenant-accent-hover", theme.accent_hover);
    }
    if (theme.bg_dark) {
      root.style.setProperty("--tenant-bg-dark", theme.bg_dark);
    }
    if (theme.card_bg) {
      root.style.setProperty("--tenant-card-bg", theme.card_bg);
    }
  }

  function updateDomBranding(profile) {
    if (typeof document === "undefined") return;

    // 1. Document title
    if (profile.name) {
      document.title = `${profile.name} - ${profile.tagline || "Nightlife Management"}`;
    }

    // 2. Header Brand Logo
    const headerLogo = document.querySelector(".app-brand-logo-img");
    if (headerLogo && profile.branding?.logo_header_url) {
      headerLogo.src = profile.branding.logo_header_url;
      headerLogo.alt = profile.name || "Venue Logo";
    }

    // 3. Header badge / status text if applicable
    const headerBadgeText = document.querySelector(".app-badge-text");
    if (headerBadgeText && headerBadgeText.textContent === "Harmonic") {
      headerBadgeText.textContent = profile.short_name || "Harmonic";
    }
  }

  const TenantProvider = {
    init: function () {
      const slug = resolveTenantSlug();
      activeProfile = PROFILES[slug] || PROFILES.default;

      applyThemeVariables(activeProfile.branding?.theme);
      updateDomBranding(activeProfile);

      // Asynchronously sync latest database config from server
      if (typeof window !== "undefined" && typeof fetch === "function") {
        TenantProvider.fetchLiveProfile(slug).catch(() => {});
      }

      return activeProfile;
    },

    fetchLiveProfile: async function (slug) {
      const targetSlug = slug || activeProfile.slug || "default";
      try {
        const res = await fetch(`/api/tenant-profile?slug=${encodeURIComponent(targetSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && data.tenant) {
            const t = data.tenant;
            const liveProfile = {
              tenant_id: t.tenant_id,
              slug: t.slug,
              name: t.name,
              short_name: t.name,
              tagline: t.config?.tagline || activeProfile.tagline || "",
              description: t.config?.description || activeProfile.description || "",
              branding: t.config?.branding || activeProfile.branding || {},
              operational: t.config?.operational || activeProfile.operational || {},
              modules: t.config?.modules || activeProfile.modules || {},
              terminology: t.config?.terminology || activeProfile.terminology || {}
            };
            activeProfile = { ...activeProfile, ...liveProfile };
            applyThemeVariables(activeProfile.branding?.theme);
            updateDomBranding(activeProfile);
            return activeProfile;
          }
        }
      } catch (_) {}
      return activeProfile;
    },

    getProfile: function () {
      return activeProfile;
    },

    getTenantId: function () {
      return activeProfile.tenant_id;
    },

    getSlug: function () {
      return activeProfile.slug;
    },

    getName: function () {
      return activeProfile.name;
    },

    getShortName: function () {
      return activeProfile.short_name || activeProfile.name;
    },

    getTagline: function () {
      return activeProfile.tagline || "";
    },

    getDescription: function () {
      return activeProfile.description || "";
    },

    getBranding: function () {
      return activeProfile.branding || {};
    },

    getOperationalConfig: function () {
      return activeProfile.operational || {};
    },

    isModuleEnabled: function (moduleName) {
      if (!activeProfile.modules) return true;
      return activeProfile.modules[moduleName] !== false;
    },

    getTerminology: function (termKey, fallback) {
      if (activeProfile.terminology && activeProfile.terminology[termKey]) {
        return activeProfile.terminology[termKey];
      }
      return fallback;
    },

    setTenantOverride: function (slug) {
      if (!slug || slug === "default") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, slug);
      }
      window.location.reload();
    },

    getAvailableDemoTenants: function () {
      return Object.keys(PROFILES).map((key) => ({
        slug: PROFILES[key].slug,
        name: PROFILES[key].name,
        short_name: PROFILES[key].short_name,
        unit_label: PROFILES[key].terminology?.unit_label || "Ruangan",
        has_lc: PROFILES[key].modules?.lady_companion !== false
      }));
    }
  };

  // Attach to global and export for Node if available
  global.TenantProvider = TenantProvider;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TenantProvider;
  }

  // Auto-init on script load if running in browser
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        TenantProvider.init();
      });
    } else {
      TenantProvider.init();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
