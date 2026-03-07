import { Id } from "@workspace/backend/_generated/dataModel";
import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { atomWithStorage } from "jotai/utils";

import { CONTACT_SESSION_KEY } from "@/modules/widget/constants";
import { WidgetScreen } from "@/modules/widget/types";

// Basic widget state atoms
export const widgetScreenAtom = atom<WidgetScreen>("loading");
export const organizationIdAtom = atom<string | null>(null);
export const conversationIdAtom = atom<Id<"conversations"> | null>(null);

// Basic widget message atoms
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
      return;
    }
    set(contactSessionIdAtomFamily(organizationId), value);
  },
);
