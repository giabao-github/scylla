import { ConversationStatus } from "@workspace/shared/constants/conversation";
import { STATUS_FILTER_KEY } from "@workspace/shared/constants/keys";
import { atomWithStorage } from "jotai/utils";

export const statusFilterAtom = atomWithStorage<ConversationStatus | "all">(
  STATUS_FILTER_KEY,
  "all",
);
