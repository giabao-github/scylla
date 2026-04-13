"use client";

import { useCallback, useMemo } from "react";

import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  conversationIdAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import {
  CONVERSATION_STATUS,
  type ConversationStatus,
} from "@workspace/shared/constants/conversation";
import { WidgetScreen } from "@workspace/shared/constants/screens";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { Button } from "@workspace/ui/components/button";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { FrostLens } from "@workspace/ui/components/glass/frost-lens";
import { cn } from "@workspace/ui/lib/utils";
import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon, InboxIcon } from "lucide-react";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { WidgetChatScreen } from "@/modules/widget/ui/screens/widget-chat-screen";
import { WidgetContactScreen } from "@/modules/widget/ui/screens/widget-contact-screen";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetInboxScreen } from "@/modules/widget/ui/screens/widget-inbox-screen";
import { WidgetLoadingScreen } from "@/modules/widget/ui/screens/widget-loading-screen";
import { WidgetSelectionScreen } from "@/modules/widget/ui/screens/widget-selection-screen";
import { WidgetVoiceScreen } from "@/modules/widget/ui/screens/widget-voice-screen";

interface WidgetViewProps {
  organizationId: string;
}

type NavigationHeaderProps = {
  title: string;
  onBack: () => void;
  children?: React.ReactNode;
} & (
  | { showInbox: false; onInbox?: never }
  | { showInbox?: true; onInbox: () => void }
);

const chatStatusMeta: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  [CONVERSATION_STATUS.UNRESOLVED]: {
    label: "Unresolved",
    className: "bg-rose-50/18 text-white/95 ring-white/18",
  },
  [CONVERSATION_STATUS.ESCALATED]: {
    label: "Escalated",
    className: "bg-amber-50/18 text-white/95 ring-white/18",
  },
  [CONVERSATION_STATUS.RESOLVED]: {
    label: "Resolved",
    className: "bg-emerald-50/18 text-white/95 ring-white/18",
  },
};

const getHeaderProps = (screen: WidgetScreen) => {
  switch (screen) {
    case "loading":
    case "auth":
    case "selection":
    case "error":
      return {
        timeSpeed: 0.9,
        color1: "#A78BFA",
        color2: "#8B5CF6",
        color3: "#7C3AED",
      };
    case "inbox":
    case "chat":
    case "voice":
    case "contact":
      return {
        timeSpeed: 0.4,
        color1: "#5B21B6",
        color2: "#6D28D9",
        color3: "#7C3AED",
      };
    case "library":
      return null;
    default: {
      const _exhaustiveCheck: never = screen;
      return _exhaustiveCheck;
    }
  }
};

const getHeaderContent = ({
  screen,
  onBack,
  onInbox,
  chatStatus,
}: {
  screen: WidgetScreen;
  onBack: () => void;
  onInbox: () => void;
  chatStatus?: ConversationStatus;
}) => {
  switch (screen) {
    case "loading":
    case "auth":
    case "selection":
    case "error":
      return (
        <div className="flex flex-col gap-y-2 justify-between px-4 py-6 font-semibold">
          <p className="text-2xl md:text-3xl">Hi there! 👋</p>
          <p className="text-base md:text-lg">Let&apos;s get you started.</p>
        </div>
      );
    case "inbox":
      return (
        <NavigationHeader title="Inbox" onBack={onBack} showInbox={false} />
      );
    case "chat":
      return (
        <NavigationHeader title="Scylla AI" onBack={onBack} onInbox={onInbox}>
          {chatStatus && (
            <div
              className={cn(
                "inline-flex gap-2 items-center px-2.5 py-1 text-[11px] font-medium rounded-full ring-1 backdrop-blur-sm shrink-0 cursor-default",
                chatStatusMeta[chatStatus].className,
              )}
            >
              <ConversationStatusIcon
                status={chatStatus}
                className="size-4 shrink-0"
              />
              {chatStatusMeta[chatStatus].label}
            </div>
          )}
        </NavigationHeader>
      );
    case "voice":
      return (
        <NavigationHeader
          title="Voice Chat"
          onBack={onBack}
          onInbox={onInbox}
        />
      );
    case "contact":
      return (
        <NavigationHeader
          title="Contact Us"
          onBack={onBack}
          onInbox={onInbox}
        />
      );
    case "library":
      return null;
    default: {
      const _exhaustiveCheck: never = screen;
      return _exhaustiveCheck;
    }
  }
};

const renderScreen = (screen: WidgetScreen, organizationId: string) => {
  switch (screen) {
    case "auth":
      return <WidgetAuthScreen />;
    case "error":
      return <WidgetErrorScreen />;
    case "loading":
      return <WidgetLoadingScreen organizationId={organizationId} />;
    case "voice":
      return <WidgetVoiceScreen />;
    case "inbox":
      return <WidgetInboxScreen />;
    case "selection":
      return <WidgetSelectionScreen />;
    case "chat":
      return <WidgetChatScreen />;
    case "contact":
      return <WidgetContactScreen />;
    case "library":
      return <p>TODO: Library</p>;
    default: {
      const _exhaustiveCheck: never = screen;
      return <p>Unknown screen: {_exhaustiveCheck}</p>;
    }
  }
};

const NavigationHeader = ({
  title,
  showInbox = true,
  onBack,
  onInbox,
  children,
}: NavigationHeaderProps) => (
  <div className="flex justify-between items-start p-2 md:p-1">
    <div className="flex gap-x-6 items-start min-w-0">
      <FrostLens blur={0} distortion={0} radius={50}>
        <Button
          variant="transparent"
          title="Go back to selection screen"
          aria-label="Go back to selection screen"
          className="size-10 hover:bg-primary/40"
          onClick={onBack}
        >
          <ArrowLeftIcon strokeWidth={3} />
        </Button>
      </FrostLens>
      <div className="flex flex-wrap gap-x-4 items-center min-w-0 pt-0.5">
        <p className="font-semibold text-[22px] md:text-2xl shrink-0">
          {title}
        </p>
        {children}
      </div>
    </div>
    {showInbox && (
      <FrostLens blur={0} distortion={0} radius={50}>
        <Button
          variant="transparent"
          aria-label="Open inbox"
          className="gap-2 px-3 h-10 hover:bg-primary/40"
          onClick={onInbox}
        >
          <InboxIcon strokeWidth={2.6} />
          <span className="hidden text-sm font-medium md:inline">Inbox</span>
        </Button>
      </FrostLens>
    )}
  </div>
);

export const WidgetView = ({ organizationId }: WidgetViewProps) => {
  const screen = useAtomValue(widgetScreenAtom);
  const conversationId = useAtomValue(conversationIdAtom);
  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);
  const validation = useQuery(
    api.public.contactSessions.validate,
    contactSessionId ? { contactSessionId } : "skip",
  );
  const isValidSession = validation?.valid === true;
  const conversation = useQuery(
    api.public.conversations.getOne,
    (screen === WIDGET_SCREENS.CHAT || screen === WIDGET_SCREENS.VOICE) &&
      conversationId &&
      contactSessionId &&
      isValidSession
      ? { conversationId, contactSessionId }
      : "skip",
  );

  const headerProps = useMemo(() => getHeaderProps(screen), [screen]);

  const onBack = useCallback(() => {
    setScreen(WIDGET_SCREENS.SELECTION);
    setConversationId(null);
  }, [setScreen, setConversationId]);

  const onInbox = useCallback(() => {
    setScreen(WIDGET_SCREENS.INBOX);
  }, [setScreen]);

  const headerContent = useMemo(
    () =>
      getHeaderContent({
        screen,
        onBack,
        onInbox,
        chatStatus:
          screen === WIDGET_SCREENS.CHAT || screen === WIDGET_SCREENS.VOICE
            ? conversation?.status
            : undefined,
      }),
    [screen, onBack, onInbox, conversation?.status],
  );

  return (
    <main className="flex overflow-hidden relative flex-col w-full rounded-none border h-svh md:h-dvh md:rounded-sm bg-muted">
      {headerProps && (
        <WidgetHeader {...headerProps} className="relative z-50 shrink-0">
          {headerContent}
        </WidgetHeader>
      )}
      <div className="flex relative flex-col flex-1 min-h-0">
        {renderScreen(screen, organizationId)}
      </div>
    </main>
  );
};
