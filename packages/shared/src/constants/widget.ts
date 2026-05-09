const WIDGET_POSITIONS = ["bottom-right", "bottom-left"] as const;

export const WIDGET_BUTTON_ID = "scylla-widget-button" as const;
export const WIDGET_CONTAINER_ID = "scylla-widget-container" as const;
export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];
export const WIDGET_DEFAULT_POSITION = WIDGET_POSITIONS[0];

export const MIN_WIDGET_HEIGHT_PX = 100 as const;
export const MAX_WIDGET_HEIGHT_PX = 2000 as const;
