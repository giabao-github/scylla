export interface ModelEntry {
  readonly chef: string;
  readonly chefSlug: string;
  readonly id: string;
  readonly name: string;
  readonly providers: readonly string[];
}

export const modelCatalog = [
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3-flash-preview",
    name: "Gemini 3.0 Flash Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3-pro-preview",
    name: "Gemini 3.0 Pro Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash Lite Latest",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-flash-latest",
    name: "Gemini Flash Latest",
    providers: ["google"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o",
    name: "GPT-4o",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4.1",
    name: "GPT-4.1",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5",
    name: "GPT-5",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5.1",
    name: "GPT-5.1",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5.2",
    name: "GPT-5.2",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    providers: ["openai", "azure"],
  },
] as const satisfies readonly ModelEntry[];

export type ModelId = (typeof modelCatalog)[number]["id"];

export const DEFAULT_MODEL_ID: ModelId = "gemini-3.1-flash-lite-preview";
