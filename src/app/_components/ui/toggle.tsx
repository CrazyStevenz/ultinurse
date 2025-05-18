"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "@radix-ui/react-toggle";

import { cn } from "../lib/utils";

export function Toggle({
	className,
	...props
}: React.ComponentProps<typeof TogglePrimitive>) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(
				"border-input hover:text-accent-foreground inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-neutral-700 bg-transparent px-2 font-medium transition hover:border-green-800 hover:bg-green-800 data-[state=on]:border-green-700 data-[state=on]:bg-green-700",
				className,
			)}
			{...props}
		/>
	);
}
