"use client";

import { useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../_components/ui/dialog.tsx";
import { Button } from "../../_components/ui/button.tsx";
import CaregiverPanel from "../algorithm/caregiver-panel";
import type { AlgorithmType } from "../../../server/api/routers/algorithm";
import { api } from "../../../trpc/react";
import Loading from "../loading.tsx";
import { LoadingIndicator } from "../../_components/loading-indicator";

export function AssignCaregiver({
	shiftId,
	caregiverName,
}: {
	shiftId: number;
	caregiverName?: string;
}) {
	const [open, setOpen] = useState(false);
	const [algorithmType, setAlgorithmType] = useState<AlgorithmType>("MCDM");
	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);

	const utils = api.useUtils();

	const { mutate, isPending } = api.shift.assignCaregiver.useMutation({
		onSuccess: async () => {
			await utils.shift.read.invalidate();
			setOpen(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button rounded size="sm">
					{caregiverName ? (
						<>
							{caregiverName}
							{isPending ? (
								<LoadingIndicator small />
							) : (
								<div
									onClick={(e) => {
										e.preventDefault();
										mutate({ shiftId, caregiverId: null });
									}}
								>
									✖️
								</div>
							)}
						</>
					) : (
						<span className="text-xl">+</span>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Assign caregiver</DialogTitle>
				</DialogHeader>

				<DialogDescription>
					Choose a caregiver to work this shift.
				</DialogDescription>

				{!isPending ? (
					<>
						<div className="mt-4">
							<label className="mb-2 block">Algorithm Type:</label>
							<select
								value={algorithmType}
								onChange={(e) =>
									setAlgorithmType(e.target.value as AlgorithmType)
								}
								className="h-10 w-full rounded-md bg-neutral-900 px-4 py-2 text-neutral-50 ring-offset-white transition-colors hover:bg-neutral-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:ring-offset-neutral-950 dark:hover:bg-neutral-50/90 dark:focus-visible:ring-neutral-300 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
							>
								<option value="MCDM">MCDM Algorithm</option>
								<option value="GREEDY">Greedy Algorithm</option>
							</select>

							<div className="mt-4">
								<label className="mb-2 block">
									Night Shift Weight: {nightWeight}
								</label>
								<input
									type="range"
									min="0"
									max="5"
									value={nightWeight}
									onChange={(e) => setNightWeight(Number(e.target.value))}
									className="w-full"
								/>
							</div>
							<div className="mt-2">
								<label className="mb-2 block">
									Weekend Shift Weight: {weekendWeight}
								</label>
								<input
									type="range"
									min="0"
									max="5"
									value={weekendWeight}
									onChange={(e) => setWeekendWeight(Number(e.target.value))}
									className="w-full"
								/>
							</div>
							<div className="mt-2">
								<label className="mb-2 block">
									Distance Weight: {distanceWeight}
								</label>
								<input
									type="range"
									min="0"
									max="5"
									value={distanceWeight}
									onChange={(e) => setDistanceWeight(Number(e.target.value))}
									className="w-full"
								/>
							</div>
						</div>

						<div className="h-96 overflow-y-auto">
							<CaregiverPanel
								nightWeight={nightWeight}
								weekendWeight={weekendWeight}
								distanceWeight={distanceWeight}
								algorithmType={algorithmType}
								showMeetsAllNeeds={true}
								showPartiallyMeetsNeeds={true}
								showOutOfBounds={true}
								assignCaregiver={(caregiverId: number) =>
									mutate({ shiftId, caregiverId })
								}
							/>
						</div>
					</>
				) : (
					<div className="flex h-96 flex-col items-center">
						<div className="mt-32 font-semibold">Saving...</div>
						<Loading />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
