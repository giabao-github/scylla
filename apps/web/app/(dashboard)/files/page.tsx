import { Metadata } from "next";

import { FilesView } from "@/modules/files/ui/views/files-view";

export const metadata: Metadata = {
  title: "Knowledge Base - Scylla",
  description: "Manage your knowledge base",
};

export default function Page() {
  return <FilesView />;
}
