import { WIDGET_DEFAULT_POSITION } from "@workspace/shared/constants/widget";

export const INTEGRATIONS = [
  {
    id: "html",
    name: "HTML",
    icon: "/languages/html5.svg",
  },
  {
    id: "react",
    name: "React",
    icon: "/languages/react.svg",
  },
  {
    id: "nextjs",
    name: "Next.js",
    icon: "/languages/nextjs.svg",
  },
  {
    id: "javascript",
    name: "JavaScript",
    icon: "/languages/javascript.svg",
  },
] as const;

export type IntegrationId = (typeof INTEGRATIONS)[number]["id"];

const LOCAL_WIDGET_SCRIPT_URL = "http://localhost:3001/widget.js";

export const getWidgetScriptUrl = () => {
  const url = process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL?.trim();

  if (url) {
    return url;
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_WIDGET_SCRIPT_URL;
  }

  throw new Error("NEXT_PUBLIC_WIDGET_SCRIPT_URL is not set");
};

export const createHtmlSnippet = (widgetScriptUrl: string) =>
  `<script
  src="${widgetScriptUrl}"
  async
  data-scylla-widget="true"
  data-organization-id="{{ORGANIZATION_ID}}"
  data-position="${WIDGET_DEFAULT_POSITION}"
></script>`;

export const createReactSnippet = (widgetScriptUrl: string) =>
  `"use client";

import { useEffect } from "react";

type ScyllaWidgetWindow = Window & {
  ScyllaWidget?: {
    destroy: () => void;
  };
};

export function ScyllaWidgetScript() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${widgetScriptUrl}";
    script.async = true;
    script.dataset.scyllaWidget = "true";
    script.dataset.organizationId = "{{ORGANIZATION_ID}}";
    script.dataset.position = "${WIDGET_DEFAULT_POSITION}";
    document.body.appendChild(script);

    return () => {
      (window as ScyllaWidgetWindow).ScyllaWidget?.destroy();
      script.remove();
    };
  }, []);

  return null;
}`;

export const createNextjsSnippet = (widgetScriptUrl: string) =>
  `"use client";

import { useEffect } from "react";
import Script from "next/script";

type ScyllaWidgetWindow = Window & {
  ScyllaWidget?: {
    destroy: () => void;
  };
};

export function ScyllaWidgetScript() {
  useEffect(() => {
    return () => {
      (window as ScyllaWidgetWindow).ScyllaWidget?.destroy();
    };
  }, []);

  return (
    <Script
      id="scylla-widget"
      src="${widgetScriptUrl}"
      strategy="afterInteractive"
      data-scylla-widget="true"
      data-organization-id="{{ORGANIZATION_ID}}"
      data-position="${WIDGET_DEFAULT_POSITION}"
    />
  );
}`;

export const createJavascriptSnippet = (widgetScriptUrl: string) =>
  `const script = document.createElement("script");
script.src = "${widgetScriptUrl}";
script.async = true;
script.dataset.scyllaWidget = "true";
script.dataset.organizationId = "{{ORGANIZATION_ID}}";
script.dataset.position = "${WIDGET_DEFAULT_POSITION}";
document.body.appendChild(script);`;
