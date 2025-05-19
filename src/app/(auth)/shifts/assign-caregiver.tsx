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
import { Toggle } from "../../_components/ui/toggle";

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
							<h3 className="mb-2 font-semibold">Algorithm Type:</h3>
							<div className="space-x-2">
								<Toggle
									pressed={algorithmType === "MCDM"}
									onPressedChange={() => setAlgorithmType("MCDM")}
								>
									MCDM
								</Toggle>
								<Toggle
									pressed={algorithmType === "GREEDY"}
									onPressedChange={() => setAlgorithmType("GREEDY")}
								>
									Greedy
								</Toggle>
							</div>

							<div className="mt-4">
								<div className="flex flex-row">
									<h3 className="mb-2 font-semibold">Night Shift Weight:</h3>
									&nbsp;{nightWeight}
								</div>
								<input
									type="range"
									min="0"
									max="5"
									value={nightWeight}
									onChange={(e) => setNightWeight(Number(e.target.value))}
									className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-800 to-green-500"
								/>
							</div>

							<div className="mt-4">
								<div className="flex flex-row">
									<h3 className="mb-2 font-semibold">Weekend Shift Weight:</h3>
									&nbsp;{weekendWeight}
								</div>
								<input
									type="range"
									min="0"
									max="5"
									value={weekendWeight}
									onChange={(e) => setWeekendWeight(Number(e.target.value))}
									className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-800 to-green-500"
								/>
							</div>

							<div className="mt-4">
								<div className="flex flex-row">
									<h3 className="mb-2 font-semibold">Distance Weight:</h3>
									&nbsp;{distanceWeight}
								</div>
								<input
									type="range"
									min="0"
									max="5"
									value={distanceWeight}
									onChange={(e) => setDistanceWeight(Number(e.target.value))}
									className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-800 to-green-500"
								/>
							</div>
						</div>

						<div className="mt-2 h-96 overflow-y-auto">
							<CaregiverPanel
								shiftId={shiftId}
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
					<div className="flex h-[44.25rem] flex-col items-center">
						<div className="mt-56 font-semibold">Saving...</div>
						<Loading />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
