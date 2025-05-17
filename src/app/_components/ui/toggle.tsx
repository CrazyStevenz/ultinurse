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
				"hover:bg-muted hover:text-muted-foreground data-[state=on]:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 border-input hover:text-accent-foreground inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-neutral-700 bg-transparent px-2 font-medium hover:border-green-800 hover:bg-green-800 data-[state=on]:border-green-700 data-[state=on]:bg-green-700",
				className,
			)}
			{...props}
		/>
	);
}
