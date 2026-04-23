import {
  HTML_SNIPPET,
  type IntegrationId,
  JAVASCRIPT_SNIPPET,
  NEXTJS_SNIPPET,
  REACT_SNIPPET,
} from "@/modules/integrations/constants";

export const createIntegrationSnippet = (
  integrationId: IntegrationId,
  organizationId: string,
): string => {
  const snippetMap: Record<IntegrationId, string> = {
    html: HTML_SNIPPET,
    javascript: JAVASCRIPT_SNIPPET,
    react: REACT_SNIPPET,
    nextjs: NEXTJS_SNIPPET,
  };

  const snippet = snippetMap[integrationId];
  return snippet.replace(/{{ORGANIZATION_ID}}/g, organizationId);
};
