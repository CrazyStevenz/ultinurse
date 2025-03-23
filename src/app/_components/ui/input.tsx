import * as React from "react";

import { cn } from "../lib/utils.ts";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn("h-10 rounded-md border text-black", className)}
			{...props}
		/>
	);
}

export { Input };
