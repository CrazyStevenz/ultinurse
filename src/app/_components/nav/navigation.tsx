"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
	{ name: "Home", href: "/" },
	{ name: "Shifts", href: "/shifts" },
	{ name: "Patients", href: "/patients" },
	{ name: "The Algo ™️", href: "/algorithm" },
];

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export default function Navigation() {
	const pathname = usePathname();

	return (
		<>
			{navigation.map((item) => (
				<Link
					key={item.name}
					href={item.href}
					aria-current={item.href === pathname ? "page" : undefined}
					className={classNames(
						item.href === pathname
							? "bg-white/20 text-white"
							: "text-gray-300 hover:bg-white/20 hover:text-white",
						"rounded-md px-3 py-2 text-sm font-medium",
					)}
				>
					{item.name}
				</Link>
			))}
		</>
	);
}
