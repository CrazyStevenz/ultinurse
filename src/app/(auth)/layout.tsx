import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/");
  }

  return children;
}
