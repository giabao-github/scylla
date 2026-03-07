"use client";

import { useAtomValue } from "jotai";

import { widgetScreenAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetScreen } from "@/modules/widget/types";
import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { WidgetChatScreen } from "@/modules/widget/ui/screens/widget-chat-screen";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
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
      return <p>TODO: Inbox</p>;
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
    <main className="flex overflow-hidden flex-col w-full h-full min-h-screen rounded-xl border bg-muted">
      {renderScreen(screen, organizationId)}
      <WidgetFooter />
    </main>
  );
};
