export const WIDGET_SCREENS = {
  ERROR: "error",
  LOADING: "loading",
  AUTH: "auth",
  VOICE: "voice",
  INBOX: "inbox",
  SELECTION: "selection",
  CHAT: "chat",
  CONTACT: "contact",
  LIBRARY: "library",
} as const;

export const CONTACT_SESSION_KEY = "scylla_contact_session";
export const SELECTED_MODEL_KEY = "scylla_selected_model";

export const TOOLTIP_THEME = {
  tint: "#1a1035",
  tintOpacity: 0.72,
  glow: "#8e51f0",
  glowOpacity: 0.3,
  highlight: "#fff",
  highlightOpacity: 0.55,
  blur: 0,
  distortion: 0,
  radius: 18,
  titleColor: "#fff",
  contentColor: "#fff",
  bulletColor: "#fff",
  iconColor: "#fff",
  iconBadgeColor: "#fff",
} as const;
