"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Cpu, House, LogIn, LogOut, Users } from "lucide-react";

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export function BottomNavLinks({
	isLoggedIn,
}: {
	isLoggedIn: boolean;
}) {
	const pathname = usePathname();

	return (
		<>
			<Link
				type="button"
				href="/"
				className="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-white/10"
			>
				<House
					className={classNames(
						pathname === "/" ? "dark:text-green-500" : "",
						"mb-1 h-6 w-6 dark:group-hover:text-green-400",
					)}
				/>
				<span
					className={classNames(
						pathname === "/" ? "dark:text-green-500" : "",
						"text-sm dark:group-hover:text-green-400",
					)}
				>
					Home
				</span>
			</Link>
			<Link
				type="button"
				href="/shifts"
				className="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-white/10"
			>
				<Building2
					className={classNames(
						pathname === "/shifts" ? "dark:text-green-500" : "",
						"mb-1 h-6 w-6 dark:group-hover:text-green-400",
					)}
				/>
				<span
					className={classNames(
						pathname === "/shifts" ? "dark:text-green-500" : "",
						"text-sm dark:group-hover:text-green-400",
					)}
				>
					Shifts
				</span>
			</Link>
			<Link
				type="button"
				href="/patients"
				className="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-white/10"
			>
				<Users
					className={classNames(
						pathname === "/patients" ? "dark:text-green-500" : "",
						"mb-1 h-6 w-6 dark:group-hover:text-green-400",
					)}
				/>
				<span
					className={classNames(
						pathname === "/patients" ? "dark:text-green-500" : "",
						"text-sm dark:group-hover:text-green-400",
					)}
				>
					Patients
				</span>
			</Link>
			<Link
				type="button"
				href="/algorithm"
				className="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-white/10"
			>
				<Cpu
					className={classNames(
						pathname === "/algorithm" ? "dark:text-green-500" : "",
						"mb-1 h-6 w-6 dark:group-hover:text-green-400",
					)}
				/>
				<span
					className={classNames(
						pathname === "/algorithm" ? "dark:text-green-500" : "",
						"text-sm dark:group-hover:text-green-400",
					)}
				>
					Algorithm
				</span>
			</Link>
			<Link
				type="button"
				href={isLoggedIn ? "/api/auth/signout" : "/api/auth/signin"}
				className="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-white/10 dark:focus:text-red-500"
			>
				{isLoggedIn ? (
					<LogOut className="mb-1 h-6 w-6 dark:group-hover:text-red-500" />
				) : (
					<LogIn className="mb-1 h-6 w-6 dark:group-hover:text-green-500" />
				)}
				<span
					className={`text-sm ${isLoggedIn ? "dark:group-hover:text-red-500" : "dark:group-hover:text-green-500"}`}
				>
					{isLoggedIn ? "Logout" : "Login"}
				</span>
			</Link>
		</>
	);
}
