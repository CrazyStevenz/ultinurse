import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/server/auth";

export default async function AuthenticatedLayout({
	children,
}: Readonly<{ children: ReactNode }>) {
	const session = await auth();

	if (!session) {
		redirect("/");
	}

	return children;
}
