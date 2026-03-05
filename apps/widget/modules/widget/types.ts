import { WIDGET_SCREENS } from "@/modules/widget/constants";

export type WidgetScreen = (typeof WIDGET_SCREENS)[keyof typeof WIDGET_SCREENS];
