"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const topNavLinks = [
	{ name: "Home", href: "/" },
	{ name: "Shifts", href: "/shifts" },
	{ name: "Patients", href: "/patients" },
];

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export function Navigation() {
	const pathname = usePathname();

	return (
		<>
			{topNavLinks.map((item) => (
				<Link
					key={item.name}
					href={item.href}
					aria-current={item.href === pathname ? "page" : undefined}
					className={classNames(
						item.href === pathname
							? "bg-[#303030] text-white"
							: "text-gray-300 hover:bg-[#202020] hover:text-white",
						"rounded-md px-3 py-2 font-medium",
					)}
				>
					{item.name}
				</Link>
			))}
		</>
	);
}
