import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { atomWithStorage } from "jotai/utils";

import { Id } from "@workspace/backend/_generated/dataModel.js";

import { ConversationStatus } from "@workspace/shared/constants/conversation";
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

// Basic widget state atoms
export const widgetScreenAtom = atom<WidgetScreen>("loading");
export const organizationIdAtom = atom<string | null>(null);
export const conversationIdAtom = atom<Id<"conversations"> | null>(null);

// Basic message atoms
export const errorMessageAtom = atom<string | null>(null);
export const loadingMessageAtom = atom<string | null>(null);

// Contact session
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

// Agent atoms
export const selectedModelAtom = atomWithStorage<ModelId>(
  SELECTED_MODEL_KEY,
  DEFAULT_MODEL_ID,
);

export const statusFilterAtom = atomWithStorage<ConversationStatus | "all">(
  STATUS_FILTER_KEY,
  "all",
);
