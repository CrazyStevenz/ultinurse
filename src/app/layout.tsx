import "@/styles/globals.css";

import { Geist } from "next/font/google";
import { type ReactNode } from "react";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import Navbar from "@/app/_components/nav/navbar";

const geist = Geist();

export const metadata: Metadata = {
	title: "OptiNurse",
	description: "A nursing staff management platform",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
	children,
}: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" className={geist.className + " dark"}>
			<body className="bg-white text-black dark:bg-black dark:text-white">
				<Navbar />

				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
