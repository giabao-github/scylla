export const WIDGET_SCREENS = {
  ERROR: "error",
  LOADING: "loading",
  AUTH: "auth",
  VOICE: "voice",
  INBOX: "inbox",
  SELECTION: "selection",
  CHAT: "chat",
  CONTACT: "contact",
} as const;

export type WidgetScreen = (typeof WIDGET_SCREENS)[keyof typeof WIDGET_SCREENS];
