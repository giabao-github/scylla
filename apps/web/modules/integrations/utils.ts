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
  const snippetMap: Record<IntegrationId, string> = {
    html: createHtmlSnippet(widgetScriptUrl),
    javascript: createJavascriptSnippet(widgetScriptUrl),
    react: createReactSnippet(widgetScriptUrl),
    nextjs: createNextjsSnippet(widgetScriptUrl),
  };

  const snippet = snippetMap[integrationId];
  return snippet.replace(/{{ORGANIZATION_ID}}/g, organizationId);
};
