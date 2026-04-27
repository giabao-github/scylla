import {
  type IntegrationId,
  createHtmlSnippet,
  createJavascriptSnippet,
  createNextjsSnippet,
  createReactSnippet,
  getWidgetScriptUrl,
} from "@/modules/integrations/constants";

export const createIntegrationSnippet = (
  integrationId: IntegrationId,
  organizationId: string,
): string => {
  const widgetScriptUrl = getWidgetScriptUrl();
  const snippetFactories: Record<IntegrationId, (url: string) => string> = {
    html: createHtmlSnippet,
    javascript: createJavascriptSnippet,
    react: createReactSnippet,
    nextjs: createNextjsSnippet,
  };

  const snippet = snippetFactories[integrationId](widgetScriptUrl);
  return snippet.replace(/{{ORGANIZATION_ID}}/g, organizationId);
};
