import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type ReactNode } from "react";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import Navbar from "@/app/_components/nav/navbar";

export const metadata: Metadata = {
  title: "OptiNurse",
  description: "A nursing staff management platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable + " dark"}>
      <body className="bg-white dark:bg-black">
        <Navbar />

        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
