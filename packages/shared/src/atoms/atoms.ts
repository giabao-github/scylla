import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { atomWithStorage } from "jotai/utils";

import type { Doc, Id } from "@workspace/backend/_generated/dataModel";

import {
  CONTACT_SESSION_KEY,
  SELECTED_MODEL_KEY,
  STATUS_FILTER_KEY,
} from "@workspace/shared/constants/keys";
import {
  DEFAULT_MODEL_ID,
  ModelId,
} from "@workspace/shared/constants/model-catalog";
import { WidgetScreen } from "@workspace/shared/constants/screens";
import { ConversationStatus } from "@workspace/shared/types/conversation";

// Interfaces
export interface WidgetOrganizationProfile {
  clerkOrganizationId: string;
  name: string;
  imageUrl?: string;
  createdAt?: number;
}

export interface PublicWidgetSettings {
  greetingMessage: string;
  defaultSuggestions: {
    firstSuggestion?: string;
    secondSuggestion?: string;
    thirdSuggestion?: string;
  };
  vapiSettings: {
    assistantId?: string;
    phoneNumber?: string;
  };
}

// Widget atoms
export const widgetScreenAtom = atom<WidgetScreen>("loading");
export const organizationIdAtom = atom<Id<"organizations"> | null>(null);
export const clerkOrganizationIdAtom = atom<string | null>(null);

export const organizationProfileAtom = atom<WidgetOrganizationProfile | null>(
  null,
);
export const conversationIdAtom = atom<Id<"conversations"> | null>(null);
export const widgetSettingsAtom = atom<PublicWidgetSettings | null>(null);

// Message atoms
export const errorMessageAtom = atom<string | null>(null);
export const loadingMessageAtom = atom<string | null>(null);

// Contact session atoms
const contactSessionIdAtomFamily = atomFamily((organizationId: string) =>
  atomWithStorage<Id<"contactSessions"> | null>(
    `${CONTACT_SESSION_KEY}_${organizationId}`,
    null,
  ),
);

export const contactSessionIdAtom = atom(
  (get) => {
    const organizationId = get(organizationIdAtom);
    if (!organizationId) {
      return null;
    }
    return get(contactSessionIdAtomFamily(organizationId));
  },
  (get, set, value: Id<"contactSessions"> | null) => {
    const organizationId = get(organizationIdAtom);
    if (!organizationId) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Attempted to set contactSessionId without organizationId",
        );
      }
      return;
    }
    set(contactSessionIdAtomFamily(organizationId), value);
  },
);

// Agent atom
export const selectedModelAtom = atomWithStorage<ModelId>(
  SELECTED_MODEL_KEY,
  DEFAULT_MODEL_ID,
);

// Filter atom
export const statusFilterAtom = atomWithStorage<ConversationStatus | "all">(
  STATUS_FILTER_KEY,
  "all",
);

// Vapi atoms
export const vapiSecretsAtom = atom<{ publicApiKey: string } | null>(null);
export const hasVapiSecretsAtom = atom((get) => get(vapiSecretsAtom) !== null);
