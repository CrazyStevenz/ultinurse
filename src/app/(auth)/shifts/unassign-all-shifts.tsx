"use client";

import { useState } from "react";
import { Button } from "@headlessui/react";
import { api } from "../../../trpc/react";

export function UnassignAllShifts() {
	const { mutate, isPending } = api.shift.clearAssignments.useMutation({});

	return (
		<Button onClick={() => mutate()} disabled={isPending}>
			Unassign all shifts
		</Button>
	);
}
