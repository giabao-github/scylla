import { EMBED_DEFAULT_POSITION } from "@/config";

export { EMBED_DEFAULT_POSITION };

export const EMBED_DEMO_DEFAULT_ORG_ID =
  import.meta.env.VITE_DEMO_ORG_ID?.trim() || "";

export const EMBED_DEMO_WIDGET_URL =
  import.meta.env.VITE_WIDGET_URL?.trim() || "http://localhost:3001";
