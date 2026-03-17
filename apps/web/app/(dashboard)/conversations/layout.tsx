import type { ReactNode } from "react";

import { ConversationsLayout } from "@/modules/dashboard/ui/layouts/conversations-layout";

const Layout = ({ children }: { children: ReactNode }) => {
  return <ConversationsLayout>{children}</ConversationsLayout>;
};

export default Layout;
