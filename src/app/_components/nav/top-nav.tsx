import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

import { Navigation } from "./top-nav-links.tsx";
import { auth } from "../../../server/auth/index.ts";

export async function TopNav() {
	const session = await auth();

	return (
		<div className="container mx-auto">
			<div className="relative flex h-16 items-center justify-between">
				<div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
					<Link
						href="/"
						className="flex items-center space-x-3 rtl:space-x-reverse"
					>
						<span className="self-center whitespace-nowrap text-2xl font-extrabold text-white">
							Ulti<span className="text-green-500">Nurse</span>
						</span>
					</Link>
					{session && (
						<div className="hidden sm:ml-6 sm:block">
							<div className="flex space-x-4">
								<Navigation />
							</div>
						</div>
					)}
				</div>
				<div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
					{session ? (
						<Link
							href="/api/auth/signout"
							className="rounded-full bg-red-600 px-5 py-2 font-semibold text-white no-underline transition hover:bg-red-500"
						>
							<LogOut className="mb-1 inline-flex h-6 w-6 dark:group-hover:text-red-600" />{" "}
							Sign out
						</Link>
					) : (
						<Link
							href="/api/auth/signin"
							className="rounded-full bg-green-600 px-5 py-2 font-semibold text-white no-underline transition hover:bg-green-500"
						>
							<LogIn className="mb-1 inline-flex h-6 w-6 dark:group-hover:text-green-600" />{" "}
							Sign in
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
