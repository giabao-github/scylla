"use client";

import { useCallback, useMemo } from "react";

import {
  conversationIdAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import { WidgetScreen } from "@workspace/shared/constants/screens";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { Button } from "@workspace/ui/components/button";
import { FrostLens } from "@workspace/ui/components/glass/frost-lens";
import { useAtomValue } from "jotai";
import { useSetAtom } from "jotai";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { WidgetChatScreen } from "@/modules/widget/ui/screens/widget-chat-screen";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetInboxScreen } from "@/modules/widget/ui/screens/widget-inbox-screen";
import { WidgetLoadingScreen } from "@/modules/widget/ui/screens/widget-loading-screen";
import { WidgetSelectionScreen } from "@/modules/widget/ui/screens/widget-selection-screen";

interface WidgetViewProps {
  organizationId: string;
}

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
      return {
        timeSpeed: 0.4,
        color1: "#5B21B6",
        color2: "#6D28D9",
        color3: "#7C3AED",
      };
    case "voice":
    case "contact":
    case "library":
      return null;
    default:
      const _exhaustiveCheck: never = screen;
      return _exhaustiveCheck;
  }
};

const getHeaderContent = (screen: WidgetScreen, onBack: () => void) => {
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
    case "chat":
      return (
        <div className="flex justify-between p-2 md:p-1">
          <div className="flex gap-x-6 items-center">
            <FrostLens blur={0} distortion={0} radius={50}>
              <Button
                variant="transparent"
                aria-label="Back to selection screen"
                className="size-10 hover:bg-primary/40"
                onClick={onBack}
              >
                <ArrowLeftIcon strokeWidth={3} />
              </Button>
            </FrostLens>
            <p className="text-2xl font-semibold">
              {screen === "inbox" ? "Inbox" : "Scylla AI"}
            </p>
          </div>
          {screen === "chat" && (
            <FrostLens blur={0} distortion={0} radius={50}>
              <Button
                disabled
                variant="transparent"
                aria-label="Open menu"
                className="size-10 hover:bg-primary/40"
              >
                <MenuIcon strokeWidth={3} />
              </Button>
            </FrostLens>
          )}
        </div>
      );
    case "voice":
    case "contact":
    case "library":
      return null;
    default:
      const _exhaustiveCheck: never = screen;
      return _exhaustiveCheck;
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
      return <p>TODO: Voice</p>;
    case "inbox":
      return <WidgetInboxScreen />;
    case "selection":
      return <WidgetSelectionScreen />;
    case "chat":
      return <WidgetChatScreen />;
    case "contact":
      return <p>TODO: Contact</p>;
    case "library":
      return <p>TODO: Library</p>;
    default: {
      const _exhaustiveCheck: never = screen;
      return <p>Unknown screen: {_exhaustiveCheck}</p>;
    }
  }
};

export const WidgetView = ({ organizationId }: WidgetViewProps) => {
  const screen = useAtomValue(widgetScreenAtom);
  const setScreen = useSetAtom(widgetScreenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const headerProps = useMemo(() => getHeaderProps(screen), [screen]);

  const onBack = useCallback(() => {
    setScreen(WIDGET_SCREENS.SELECTION);
    setConversationId(null);
  }, [setScreen, setConversationId]);

  const headerContent = useMemo(
    () => getHeaderContent(screen, onBack),
    [screen, onBack],
  );

  return (
    <main className="flex relative flex-col w-full rounded-none border h-dvh md:rounded-sm bg-muted">
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
