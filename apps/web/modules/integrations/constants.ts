import {
  WIDGET_BUTTON_ID,
  WIDGET_CONTAINER_ID,
} from "@workspace/shared/constants/widget";

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

const DEFAULT_POSITION = "bottom-right";

const getWidgetScriptUrl = () => {
  const url = process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL;

  if (!url) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3001/widget.js";
    }
    throw new Error("NEXT_PUBLIC_WIDGET_SCRIPT_URL is not set");
  }
  return url;
};

export const WIDGET_SCRIPT_URL = getWidgetScriptUrl();

export const HTML_SNIPPET = `
  <script
    src="${WIDGET_SCRIPT_URL}"
    data-scylla-widget="true"
    data-organization-id="{{ORGANIZATION_ID}}"
    data-position="${DEFAULT_POSITION}"
  ></script>
`;

export const REACT_SNIPPET = `
  import { useEffect } from "react";

  export function ScyllaWidgetScript() {
    useEffect(() => {
      const script = document.createElement("script");
      script.src = "${WIDGET_SCRIPT_URL}";
      script.async = true;
      script.dataset.scyllaWidget = "true";
      script.dataset.organizationId = "{{ORGANIZATION_ID}}";
      script.dataset.position = "${DEFAULT_POSITION}";
      document.body.appendChild(script);

      return () => {
        script.remove();
        document.getElementById("${WIDGET_BUTTON_ID}")?.remove();
        document.getElementById("${WIDGET_CONTAINER_ID}")?.remove();
      };
    }, []);

    return null;
  }
`;

export const NEXTJS_SNIPPET = `
  import { useEffect } from "react";
  import Script from "next/script";

  export function ScyllaWidgetScript() {
    useEffect(() => {
      return () => {
        document.getElementById("${WIDGET_BUTTON_ID}")?.remove();
        document.getElementById("${WIDGET_CONTAINER_ID}")?.remove();
      };
    }, []);

    return (
      <Script
        id="scylla-widget"
        src="${WIDGET_SCRIPT_URL}"
        strategy="afterInteractive"
        data-scylla-widget="true"
        data-organization-id="{{ORGANIZATION_ID}}"
        data-position="${DEFAULT_POSITION}"
      />
    );
  }
`;

export const JAVASCRIPT_SNIPPET = `
  const script = document.createElement("script");
  script.src = "${WIDGET_SCRIPT_URL}";
  script.async = true;
  script.dataset.scyllaWidget = "true";
  script.dataset.organizationId = "{{ORGANIZATION_ID}}";
  script.dataset.position = "${DEFAULT_POSITION}";
  document.body.appendChild(script);
`;
