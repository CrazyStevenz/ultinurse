import "@/styles/globals.css";

import { Geist } from "next/font/google";
import { type ReactNode } from "react";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import TopNav from "@/app/_components/nav/top-nav";
import BottomNav from "@/app/_components/nav/bottom-nav";

const geist = Geist({ subsets: ["latin"] });

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
			<body className="min-h-screen bg-white bg-gradient-to-b from-black to-green-900 text-black dark:bg-black dark:text-white">
				<nav className="hidden md:block">
					<TopNav />
				</nav>

				<main className="mx-2 min-h-[85vh] py-2">
					<TRPCReactProvider>{children}</TRPCReactProvider>
				</main>

				<nav className="mt-14 md:mt-0 md:hidden">
					<BottomNav />
				</nav>
			</body>
		</html>
	);
}
