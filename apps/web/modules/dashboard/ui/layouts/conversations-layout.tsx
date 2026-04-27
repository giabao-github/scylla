"use client";

import type { ReactNode } from "react";

import { usePathname } from "next/navigation";

import { ConversationsPanel } from "@/modules/dashboard/ui/components/conversations-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";

const CONVERSATIONS_LIST_PATH = "/conversations";

export const ConversationsLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const desktopLayout = (
    <ResizablePanelGroup className="flex-1" orientation="horizontal">
      <ResizablePanel defaultSize="30%" maxSize="30%" minSize="20%">
        <ConversationsPanel />
      </ResizablePanel>
      <ResizableHandle className="focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
      <ResizablePanel defaultSize="70%">{children}</ResizablePanel>
    </ResizablePanelGroup>
  );

  if (isMobile === undefined) {
    return desktopLayout;
  }

  if (isMobile) {
    const isViewingConversationDetail = pathname !== CONVERSATIONS_LIST_PATH;

    if (isViewingConversationDetail) {
      return (
        <div className="flex overflow-hidden flex-col flex-1 min-w-0 min-h-0">
          {children}
        </div>
      );
    }

    return (
      <div className="flex overflow-hidden flex-col flex-1 min-w-0 min-h-0">
        <ConversationsPanel />
      </div>
    );
  }

  return desktopLayout;
};
