"use client";

import { ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";

import { ContactPanel } from "@/modules/dashboard/ui/components/contact-panel";

export const ConversationIdLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex overflow-hidden flex-col flex-1 min-h-0">
        {children}
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="flex-1" orientation="horizontal">
      <ResizablePanel defaultSize="70%" maxSize="70%" minSize="60%">
        <div className="flex flex-col flex-1 h-full min-h-0">{children}</div>
      </ResizablePanel>
      <ResizableHandle className="focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" />
      <ResizablePanel defaultSize="30%" minSize="20%">
        <ContactPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
