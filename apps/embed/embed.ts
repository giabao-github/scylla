import { chatBubbleIcon, closeIcon } from "@/icons";
import {
  WIDGET_BUTTON_ID,
  WIDGET_CONTAINER_ID,
  WIDGET_DEFAULT_POSITION,
  type WidgetPosition,
} from "@workspace/shared/constants/widget";

declare global {
  interface Window {
    ScyllaWidget?: {
      init: (newConfig: {
        organizationId?: string;
        position?: WidgetPosition;
      }) => void;
      show: () => void;
      hide: () => void;
      destroy: () => void;
      isOpen: () => boolean;
    };
  }
}

(function () {
  const MAX_WIDGET_HEIGHT_PX = 2000;
  const OPEN_WIDGET_LABEL = "Open chat widget";
  const CLOSE_WIDGET_LABEL = "Close chat widget";
  const WIDGET_SCRIPT_MARKER = "true";
  // Intentionally high so the launcher stays above typical host app chrome.
  const WIDGET_BUTTON_Z_INDEX = 999999;
  const WIDGET_CONTAINER_Z_INDEX = 999998;
  // Microphone is required for voice calls; clipboard-write supports copy actions.
  const IFRAME_ALLOW_PERMISSIONS = "microphone; clipboard-write";
  let iframe: HTMLIFrameElement | null = null;
  let container: HTMLDivElement | null = null;
  let loadingOverlay: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;
  let isOpen = false;
  let hasRequestedIframeLoad = false;
  let showTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingInitListener: (() => void) | null = null;

  // Get configuration from script tag
  let organizationId: string | null = null;
  let position: WidgetPosition = WIDGET_DEFAULT_POSITION;

  const resolvePosition = (value: string | null | undefined): WidgetPosition =>
    value === "bottom-left" || value === "bottom-right"
      ? value
      : WIDGET_DEFAULT_POSITION;

  const isLocalDevelopmentHost = (hostname: string) =>
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";

  const isEmbedScript = (script: Element): script is HTMLScriptElement => {
    if (!(script instanceof HTMLScriptElement) || !script.src) {
      return false;
    }

    if (script.getAttribute("data-scylla-widget") === WIDGET_SCRIPT_MARKER) {
      return true;
    }

    try {
      const scriptUrl = new URL(script.src, window.location.href);
      const pathname = scriptUrl.pathname.toLowerCase();

      // Support both the published widget bundle and the Vite dev entry.
      return (
        pathname.endsWith("/widget.js") ||
        pathname.endsWith("/embed.js") ||
        pathname.endsWith("/embed.ts")
      );
    } catch {
      return false;
    }
  };

  const findEmbedScript = (): HTMLScriptElement | null => {
    const markedScript = Array.from(
      document.querySelectorAll(
        "script[data-organization-id][data-scylla-widget]",
      ),
    ).find(isEmbedScript);

    if (markedScript) {
      return markedScript;
    }

    return (
      Array.from(
        document.querySelectorAll("script[data-organization-id]"),
      ).find(isEmbedScript) ?? null
    );
  };

  // Try to get the current script
  const currentScript =
    document.currentScript instanceof HTMLScriptElement
      ? document.currentScript
      : null;
  if (currentScript) {
    organizationId = currentScript.getAttribute("data-organization-id");
    position = resolvePosition(currentScript.getAttribute("data-position"));
  } else {
    // Fallback: find the Scylla loader script explicitly
    const embedScript = findEmbedScript();

    if (embedScript) {
      organizationId = embedScript.getAttribute("data-organization-id");
      position = resolvePosition(embedScript.getAttribute("data-position"));
    }
  }

  // Exit if no organization ID
  if (!organizationId) {
    console.error("Scylla Widget: data-organization-id attribute is required");
    return;
  }

  const resolveWidgetUrl = (script: HTMLScriptElement | null): URL | null => {
    const configuredWidgetUrl = script?.getAttribute("data-widget-url");

    try {
      if (configuredWidgetUrl) {
        return new URL(configuredWidgetUrl, window.location.href);
      }

      if (script?.src) {
        return new URL("/", new URL(script.src, window.location.href));
      }
    } catch (error) {
      console.error("Scylla Widget: invalid widget URL configuration", error);
      return null;
    }

    console.error("Scylla Widget: unable to resolve widget URL");
    return null;
  };

  let resolvedWidgetUrl: URL | null = resolveWidgetUrl(currentScript);
  if (!resolvedWidgetUrl) {
    const fallbackScript = findEmbedScript();

    if (fallbackScript && fallbackScript !== currentScript) {
      resolvedWidgetUrl = resolveWidgetUrl(fallbackScript);
    }
  }

  if (!resolvedWidgetUrl) {
    return;
  }

  const widgetUrl = resolvedWidgetUrl;

  if (
    widgetUrl.protocol !== "https:" &&
    !isLocalDevelopmentHost(widgetUrl.hostname)
  ) {
    console.warn(
      "Scylla Widget: non-HTTPS widget URL detected outside localhost",
      widgetUrl.toString(),
    );
  }

  function init() {
    if (document.readyState === "loading") {
      if (!pendingInitListener) {
        pendingInitListener = () => {
          pendingInitListener = null;
          render();
        };
        document.addEventListener("DOMContentLoaded", pendingInitListener, {
          once: true,
        });
      }
    } else {
      render();
    }
  }

  function setLoadingOverlayVisible(isVisible: boolean) {
    if (!loadingOverlay) {
      return;
    }

    loadingOverlay.style.display = isVisible ? "flex" : "none";
    loadingOverlay.style.opacity = isVisible ? "1" : "0";

    if (container) {
      container.setAttribute("aria-busy", String(isVisible));
    }
  }

  function requestIframeLoad() {
    if (!iframe || hasRequestedIframeLoad) {
      return;
    }

    const iframeSrc = buildWidgetUrl();
    if (!iframeSrc) {
      return;
    }

    hasRequestedIframeLoad = true;
    setLoadingOverlayVisible(true);
    iframe.src = iframeSrc;
  }

  function handleIframeLoad() {
    if (!hasRequestedIframeLoad) {
      return;
    }

    setLoadingOverlayVisible(false);
  }

  function handleButtonMouseEnter() {
    if (button) {
      button.style.transform = "scale(1.05)";
    }
  }

  function handleButtonMouseLeave() {
    if (button) {
      button.style.transform = "scale(1)";
    }
  }

  function render() {
    // Create floating action button
    button = document.createElement("button");
    button.id = WIDGET_BUTTON_ID;
    button.type = "button";
    button.innerHTML = chatBubbleIcon;
    button.setAttribute("aria-label", OPEN_WIDGET_LABEL);
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-haspopup", "dialog");
    button.style.cssText = `
      position: fixed;
      ${position === "bottom-right" ? "right: 20px;" : "left: 20px;"}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #a78bfa;
      color: white;
      border: none;
      cursor: pointer;
      z-index: ${WIDGET_BUTTON_Z_INDEX};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(167, 139, 250, 0.35);
      transition: all 0.2s ease;
    `;

    button.addEventListener("click", toggleWidget);
    button.addEventListener("mouseenter", handleButtonMouseEnter);
    button.addEventListener("mouseleave", handleButtonMouseLeave);

    document.body.appendChild(button);

    // Create container (hidden by default)
    container = document.createElement("div");
    container.id = WIDGET_CONTAINER_ID;
    container.tabIndex = -1;
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-label", "Chat widget");
    container.setAttribute("aria-busy", "true");
    button.setAttribute("aria-controls", container.id);
    container.style.cssText = `
      position: fixed;
      ${position === "bottom-right" ? "right: 20px;" : "left: 20px;"}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: ${WIDGET_CONTAINER_Z_INDEX};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(167, 139, 250, 0.35);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;

    loadingOverlay = document.createElement("div");
    loadingOverlay.setAttribute("aria-hidden", "true");
    loadingOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.35));
      color: rgba(255, 255, 255, 0.92);
      z-index: 1;
      pointer-events: none;
      transition: opacity 0.2s ease;
    `;

    const loadingSpinner = document.createElement("div");
    loadingSpinner.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: rgba(255, 255, 255, 0.95);
    `;
    loadingSpinner.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: 750, iterations: Infinity },
    );

    const loadingLabel = document.createElement("div");
    loadingLabel.textContent = "Loading widget...";
    loadingLabel.style.cssText = `
      font: 500 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0.01em;
    `;

    loadingOverlay.append(loadingSpinner, loadingLabel);

    // Create iframe
    iframe = document.createElement("iframe");
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    iframe.allow = IFRAME_ALLOW_PERMISSIONS;
    iframe.sandbox =
      "allow-scripts allow-same-origin allow-forms allow-top-navigation-by-user-activation";
    iframe.title = "Chat widget";
    iframe.addEventListener("load", handleIframeLoad);

    container.appendChild(loadingOverlay);
    container.appendChild(iframe);
    document.body.appendChild(container);
    setLoadingOverlayVisible(false);

    // Handle messages from widget
    window.addEventListener("message", handleMessage);
  }

  function buildWidgetUrl(): string | null {
    if (!organizationId) {
      console.error("Scylla Widget: missing organization ID");
      return null;
    }

    const url = new URL(widgetUrl.toString());
    url.searchParams.set("organizationId", organizationId);
    return url.toString();
  }

  function getResizeHeight(payload: unknown): number | null {
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("height" in payload)
    ) {
      console.warn("Scylla Widget: invalid resize message payload");
      return null;
    }

    const { height } = payload as { height: unknown };
    if (typeof height !== "number" && typeof height !== "string") {
      console.warn("Scylla Widget: invalid resize height type");
      return null;
    }

    const parsedHeight = Number(height);
    if (
      !Number.isFinite(parsedHeight) ||
      parsedHeight <= 0 ||
      parsedHeight > MAX_WIDGET_HEIGHT_PX
    ) {
      return null;
    }

    return parsedHeight;
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== widgetUrl.origin) return;
    if (!iframe || event.source !== iframe.contentWindow) return;

    const data = event.data;
    if (
      typeof data !== "object" ||
      data === null ||
      typeof data.type !== "string"
    ) {
      return;
    }

    const { type, payload } = data;

    switch (type) {
      case "close":
        hide();
        break;
      case "resize": {
        const height = getResizeHeight(payload);
        if (!container || height === null) {
          break;
        }
        container.style.height = `${height}px`;
        break;
      }
    }
  }

  function toggleWidget() {
    if (isOpen) {
      hide();
    } else {
      show();
    }
  }

  function show() {
    if (container && button) {
      if (showTimeoutId) {
        clearTimeout(showTimeoutId);
        showTimeoutId = null;
      }
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }
      isOpen = true;
      requestIframeLoad();
      container.style.display = "block";
      // Trigger animation
      showTimeoutId = setTimeout(() => {
        if (container) {
          container.style.opacity = "1";
          container.style.transform = "translateY(0)";
          container.focus({ preventScroll: true });
        }
        showTimeoutId = null;
      }, 10);
      // Change button icon to close
      button.innerHTML = closeIcon;
      button.setAttribute("aria-label", CLOSE_WIDGET_LABEL);
      button.setAttribute("aria-expanded", "true");
    }
  }

  function hide() {
    if (container && button) {
      if (showTimeoutId) {
        clearTimeout(showTimeoutId);
        showTimeoutId = null;
      }
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }
      isOpen = false;
      container.style.opacity = "0";
      container.style.transform = "translateY(10px)";
      // Hide after animation
      hideTimeoutId = setTimeout(() => {
        if (container) container.style.display = "none";
        hideTimeoutId = null;
      }, 300);
      // Change button icon back to chat
      button.innerHTML = chatBubbleIcon;
      button.setAttribute("aria-label", OPEN_WIDGET_LABEL);
      button.setAttribute("aria-expanded", "false");
      button.focus({ preventScroll: true });
    }
  }

  function destroy() {
    if (pendingInitListener) {
      document.removeEventListener("DOMContentLoaded", pendingInitListener);
      pendingInitListener = null;
    }
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
    if (showTimeoutId) {
      clearTimeout(showTimeoutId);
      showTimeoutId = null;
    }
    window.removeEventListener("message", handleMessage);
    if (container) {
      container.remove();
      container = null;
      loadingOverlay = null;
    }
    if (iframe) {
      iframe.removeEventListener("load", handleIframeLoad);
      iframe = null;
    }
    hasRequestedIframeLoad = false;
    if (button) {
      button.removeEventListener("click", toggleWidget);
      button.removeEventListener("mouseenter", handleButtonMouseEnter);
      button.removeEventListener("mouseleave", handleButtonMouseLeave);
      button.remove();
      button = null;
    }
    isOpen = false;
  }

  // Function to reinitialize with new config
  function reinit(newConfig: {
    organizationId?: string;
    position?: WidgetPosition;
  }) {
    // Destroy existing widget
    destroy();

    // Update config
    if (newConfig.organizationId) {
      organizationId = newConfig.organizationId;
    }
    // Public API consumers may call this from plain JavaScript, so keep the runtime guard.
    if (newConfig.position) {
      position = resolvePosition(newConfig.position);
    }

    // Reinitialize
    init();
  }

  // Expose API to global scope
  window.ScyllaWidget = {
    init: reinit,
    show,
    hide,
    destroy,
    isOpen: () => isOpen,
  };

  // Auto-initialize
  init();
})();
