/*
  Frontend API configuration for Harmonic Karaoke SaaS.
*/

const browserLocation = globalThis?.window?.location;

export const API_BASE_URL = (browserLocation && browserLocation.protocol.startsWith("http"))
  ? `${browserLocation.origin}/exec`
  : "/exec";

/*
  Harmonic Cloud SaaS Mode:
  Kontrol TV fisik lokal dinonaktifkan untuk edisi pure cloud.
*/
export const LOCAL_TV_BRIDGE_URL = "";
export const LOCAL_TV_BRIDGE_ENABLED = false;
export const LOCAL_TV_BRIDGE_TOKEN = "";

/*
  Developer/testing helper.
*/
export const DEV_SHORT_SESSION_ENABLED = false;
export const DEV_MIN_SESSION_MINUTES = 60;
