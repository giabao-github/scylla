import "@workspace/ui/globals.css";
import { Metadata } from "next";
import { Geist_Mono, Zalando_Sans } from "next/font/google";

import { Providers } from "@/components/providers";

const fontSans = Zalando_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Scylla Widget",
  description: "Next.js application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans font-medium antialiased `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
