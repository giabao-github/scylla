"use client";

import { useAtomValue } from "jotai";

import { widgetScreenAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetFooter } from "@/modules/widget/ui/components/widget-footer";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";

interface WidgetViewProps {
  organizationId: string;
}

export const WidgetView = ({ organizationId }: WidgetViewProps) => {
  const screen = useAtomValue(widgetScreenAtom);

  const screenComponents = {
    error: <p>TODO: Error</p>,
    loading: <p>TODO: Loading</p>,
    auth: <WidgetAuthScreen organizationId={organizationId} />,
    voice: <p>TODO: Voice</p>,
    inbox: <p>TODO: Inbox</p>,
    selection: <p>TODO: Selection</p>,
    chat: <p>TODO: Chat</p>,
    contact: <p>TODO: Contact</p>,
  };

  return (
    <main className="flex overflow-hidden flex-col w-full h-full min-h-screen rounded-xl border bg-muted">
      {screenComponents[screen]}
      <WidgetFooter />
    </main>
  );
};
