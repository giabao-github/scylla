import type { ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";

import { ConversationsPanel } from "@/modules/dashboard/ui/components/conversations-panel";

export const ConversationsLayout = ({ children }: { children: ReactNode }) => {
  return (
    <ResizablePanelGroup className="flex-1 h-full" orientation="horizontal">
      <ResizablePanel defaultSize="30%" maxSize="30%" minSize="20%">
        <ConversationsPanel />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="70%" className="h-full">
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
