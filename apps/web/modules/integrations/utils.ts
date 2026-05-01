import {
  type IntegrationId,
  createHtmlSnippet,
  createJavascriptSnippet,
  createNextjsSnippet,
  createReactSnippet,
  getWidgetScriptUrl,
} from "@/modules/integrations/constants";

const snippetFactories: Record<IntegrationId, (url: string) => string> = {
  html: createHtmlSnippet,
  javascript: createJavascriptSnippet,
  react: createReactSnippet,
  nextjs: createNextjsSnippet,
};

export const createIntegrationSnippet = (
  integrationId: IntegrationId,
  organizationId: string,
): string => {
  const widgetScriptUrl = getWidgetScriptUrl();

  const snippet = snippetFactories[integrationId](widgetScriptUrl);
  return snippet.replace(/{{ORGANIZATION_ID}}/g, organizationId);
};
