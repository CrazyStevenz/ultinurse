"use client";

import { useState } from "react";

import CaregiverPanel from "./caregiver-panel.tsx";
import type {
	AlgorithmType,
	GlobalAlgorithmType,
} from "../../../server/api/routers/algorithm";
import { api } from "../../../trpc/react.tsx";
import { ShiftPanel } from "./shifts-panel.tsx";

export function Algorithm() {
	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);
	const [algorithmType, setAlgorithmType] = useState<AlgorithmType>("MCDM");
	const [showMeetsAllNeeds, setShowMeetsAllNeeds] = useState(true);
	const [showPartiallyMeetsNeeds, setShowPartiallyMeetsNeeds] = useState(true);
	const [showOutOfBounds, setShowOutOfBounds] = useState(true);
	const [showShifts, setShowShifts] = useState(true);
	const [globalAlgorithmType, setGlobalAlgorithmType] =
		useState<GlobalAlgorithmType>("KNAPSACK");

	const { data: shifts, isLoading } = api.algorithm.getShifts.useQuery({
		nightWeight,
		weekendWeight,
		distanceWeight,
		algorithmType,
		globalAlgorithmType,
	});

	return (
		<div className="flex flex-col items-center">
			<h1 className="mb-4 text-2xl font-bold">Nurse Fit Rankings</h1>
			<div className="mb-6 w-1/2">
				<h2 className="mb-4 text-xl font-semibold">Adjust Weights</h2>
				<div className="mb-4">
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
				<div className="mb-4">
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
				<div className="mb-4">
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
				<div className="mt-4">
					<div className="mb-4">
						<label className="mb-2 block">Global Strategy:</label>
						<select
							value={globalAlgorithmType}
							onChange={(e) =>
								setGlobalAlgorithmType(e.target.value as GlobalAlgorithmType)
							}
							className="h-10 w-full rounded-md bg-neutral-900 px-4 py-2 text-neutral-50 ring-offset-white transition-colors hover:bg-neutral-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:ring-offset-neutral-950 dark:hover:bg-neutral-50/90 dark:focus-visible:ring-neutral-300"
						>
							<option value="NONE">Use Per-Shift Algorithm</option>
							<option value="KNAPSACK">Global Knapsack Strategy</option>
						</select>
					</div>

					<label className="mb-2 block">Algorithm Type:</label>
					<select
						value={algorithmType}
						onChange={(e) => setAlgorithmType(e.target.value as AlgorithmType)}
						className="h-10 w-full rounded-md bg-neutral-900 px-4 py-2 text-neutral-50 ring-offset-white transition-colors hover:bg-neutral-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:ring-offset-neutral-950 dark:hover:bg-neutral-50/90 dark:focus-visible:ring-neutral-300 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
					>
						<option value="MCDM">MCDM Algorithm</option>
						<option value="GREEDY">Greedy Algorithm</option>
					</select>
				</div>
			</div>
			<div className="mb-6">
				<h2 className="mb-4 text-xl font-semibold">Filter Nurses</h2>
				<div className="mb-4">
					<input
						type="checkbox"
						checked={showMeetsAllNeeds}
						onChange={() => setShowMeetsAllNeeds(!showMeetsAllNeeds)}
					/>
					<label className="ml-2">Show nurses that meet all needs</label>
				</div>
				<div className="mb-4">
					<input
						type="checkbox"
						checked={showPartiallyMeetsNeeds}
						onChange={() =>
							setShowPartiallyMeetsNeeds(!showPartiallyMeetsNeeds)
						}
					/>
					<label className="ml-2">Show nurses that partially meet needs</label>
				</div>
				<div className="mb-4">
					<input
						type="checkbox"
						checked={showOutOfBounds}
						onChange={() => setShowOutOfBounds(!showOutOfBounds)}
					/>
					<label className="ml-2">Show out of bounds nurses</label>
				</div>
			</div>
			<CaregiverPanel
				nightWeight={nightWeight}
				weekendWeight={weekendWeight}
				distanceWeight={distanceWeight}
				algorithmType={algorithmType}
				showMeetsAllNeeds={showMeetsAllNeeds}
				showPartiallyMeetsNeeds={showPartiallyMeetsNeeds}
				showOutOfBounds={showOutOfBounds}
			/>
			<div className="mb-6">
				<input
					type="checkbox"
					checked={showShifts}
					onChange={() => setShowShifts(!showShifts)}
				/>
				<label className="ml-2">Show available shifts</label>
			</div>
			<ShiftPanel
				shifts={shifts}
				isLoading={isLoading}
				showShifts={showShifts}
				error={null}
			/>
		</div>
	);
}
