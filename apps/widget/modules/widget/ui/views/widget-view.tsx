"use client";

import { WidgetScreen } from "@workspace/shared/constants/screens";
import { useAtomValue } from "jotai";

import { widgetScreenAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { WidgetChatScreen } from "@/modules/widget/ui/screens/widget-chat-screen";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetInboxScreen } from "@/modules/widget/ui/screens/widget-inbox-screen";
import { WidgetLoadingScreen } from "@/modules/widget/ui/screens/widget-loading-screen";
import { WidgetSelectionScreen } from "@/modules/widget/ui/screens/widget-selection-screen";

interface WidgetViewProps {
  organizationId: string;
}

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

  return (
    <main className="flex overflow-hidden flex-col w-full h-full min-h-screen rounded-none border md:rounded-sm bg-muted">
      {renderScreen(screen, organizationId)}
    </main>
  );
};
