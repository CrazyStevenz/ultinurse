"use client";

import { Button } from "../../_components/ui/button.tsx";
import { api } from "../../../trpc/react";
import { LoadingIndicator } from "../../_components/loading-indicator";

export function UnassignAllShifts() {
	const utils = api.useUtils();

	const { mutate, isPending } = api.shift.deleteAllAssignments.useMutation({
		onSuccess: () => utils.shift.invalidate(),
	});

	return (
		<Button
			onClick={() => mutate()}
			disabled={isPending}
			className="dark:bg-amber-400 dark:hover:bg-amber-500"
		>
			Unassign all shifts
			{isPending && <LoadingIndicator small />}
		</Button>
	);
}
