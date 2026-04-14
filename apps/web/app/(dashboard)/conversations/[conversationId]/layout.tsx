import type { ReactNode } from "react";

import { ConversationIdLayout } from "@/modules/dashboard/ui/layouts/conversation-id-layout";

const Layout = ({ children }: { children: ReactNode }) => {
  return <ConversationIdLayout>{children}</ConversationIdLayout>;
};

export default Layout;
