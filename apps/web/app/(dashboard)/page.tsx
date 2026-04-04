import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Dashboard - Scylla",
  description: "Your dashboard",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-y-4 justify-center items-center text-base min-h-svh">
      <Image src="/logo.png" alt="Scylla logo" width={100} height={100} />
    </div>
  );
}
