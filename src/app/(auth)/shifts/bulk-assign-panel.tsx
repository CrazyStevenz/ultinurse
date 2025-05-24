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
import type {
	AlgorithmType,
	StrategyType,
} from "../../../server/api/routers/algorithm";
import { api } from "../../../trpc/react";
import Loading from "../loading.tsx";
import { Toggle } from "../../_components/ui/toggle";

export function BulkAssignCaregiver() {
	const [open, setOpen] = useState(false);
	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);
	const [algorithmType, setAlgorithmType] = useState<AlgorithmType>("MCDM");
	const [strategyType, setStrategyType] = useState<StrategyType>("SERIAL");

	const utils = api.useUtils();

	const { mutate, isPending } = api.algorithm.getShifts.useMutation({
		onSuccess: async () => {
			await utils.shift.invalidate();
			setOpen(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="dark:bg-emerald-400 dark:hover:bg-emerald-500">
					Bulk assign
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Bulk assign caregivers</DialogTitle>
				</DialogHeader>

				<DialogDescription>
					All caregivers will be assigned to an available shift
				</DialogDescription>

				{!isPending ? (
					<>
						<div className="mt-4">
							<h3 className="mb-2 font-semibold">Algorithm:</h3>
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

							<h3 className="mb-2 mt-4 font-semibold">Strategy:</h3>
							<div className="space-x-2">
								<Toggle
									pressed={strategyType === "SERIAL"}
									onPressedChange={() => setStrategyType("SERIAL")}
								>
									Serial
								</Toggle>
								<Toggle
									pressed={strategyType === "KNAPSACK"}
									onPressedChange={() => setStrategyType("KNAPSACK")}
								>
									Knapsack
								</Toggle>
								<Toggle
									pressed={strategyType === "TABU"}
									onPressedChange={() => setStrategyType("TABU")}
								>
									Tabu
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

						<div className="mt-4 flex justify-end">
							<Button
								onClick={() =>
									mutate({
										nightWeight,
										weekendWeight,
										distanceWeight,
										algorithmType,
										strategyType,
									})
								}
							>
								Save
							</Button>
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
