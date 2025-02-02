import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

import Navigation from "@/app/_components/nav/top-nav-links";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function TopNav() {
	const session = await auth();

	if (session?.user) {
		void api.caregiver.getLatest.prefetch();
	}

	return (
		<div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
			<div className="relative flex h-16 items-center justify-between">
				<div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
					<Link
						href="/"
						className="flex items-center space-x-3 rtl:space-x-reverse"
					>
						<span className="self-center whitespace-nowrap text-2xl font-extrabold text-white">
							Opti<span className="text-green-500">Nurse</span>
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
					{/* Profile dropdown */}
					{session ? (
						<Menu as="div" className="relative ml-3">
							<div>
								<MenuButton className="rounded-full bg-white/15 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20">
									<span className="absolute -inset-1.5" />
									<span className="sr-only">Open user menu</span>
									{session && <span>{session.user.name}</span>}
								</MenuButton>
							</div>
							<MenuItems
								transition
								className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white/15 py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
							>
								<MenuItem>
									<Link
										href="#"
										className="block px-4 py-2 text-sm text-white data-[focus]:bg-white/20 data-[focus]:outline-none"
									>
										Profile
									</Link>
								</MenuItem>
								<MenuItem>
									<Link
										href="/api/auth/signout"
										className="block px-4 py-2 text-sm text-white data-[focus]:bg-white/20 data-[focus]:outline-none"
									>
										Sign out
									</Link>
								</MenuItem>
							</MenuItems>
						</Menu>
					) : (
						<Link
							href="/api/auth/signin"
							className="rounded-full bg-green-700 px-10 py-3 font-semibold text-white no-underline transition hover:bg-green-600"
						>
							Sign in
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
