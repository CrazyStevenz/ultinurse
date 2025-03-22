import * as React from "react";

import { cn } from "@/app/_components/lib/utils";

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
