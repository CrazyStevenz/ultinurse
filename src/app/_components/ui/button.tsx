import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils.ts";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300",
	{
		variants: {
			variant: {
				default:
					"dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90",
				secondary:
					"dark:bg-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-700/80",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 px-3",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	rounded = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		rounded?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(
				buttonVariants({ variant, size, className }),
				rounded ? "rounded-full" : "rounded-md",
			)}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
