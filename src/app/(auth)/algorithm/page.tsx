"use client";
import { api } from "@/trpc/react";
import { useState } from "react";
import NursesPanel from "./nursesPanel";

type MockPatient = {
	name: string;
	needs: string[];
	needsNight: boolean;
	needsWeekend: boolean;
};

type AlgorithmType = "MCDM" | "GREEDY";

// interface NurseData {
// 	name: string;
// 	percentage: number;
// 	distance: number;
// 	meetsAllNeeds: boolean;
// 	outOfBounds: boolean;
// }

// interface WeightsInput {
// 	nightWeight: number;
// 	weekendWeight: number;
// 	distanceWeight: number;
// 	algorithmType: AlgorithmType;
// }

export default function Patients() {
	const distanceA = 5;
	const distanceB = 15;
	const patient: MockPatient = {
		name: "P1",
		needs: ["A"],
		needsNight: false,
		needsWeekend: true,
	};

	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);
	const [algorithmType, setAlgorithmType] = useState<AlgorithmType>("MCDM");
	const [showMeetsAllNeeds, setShowMeetsAllNeeds] = useState(true);
	const [showPartiallyMeetsNeeds, setShowPartiallyMeetsNeeds] = useState(true);
	const [showOutOfBounds, setShowOutOfBounds] = useState(true);

	const {
		data: nursesData,
		isLoading,
		error,
	} = api.algorithm.read.useQuery({
		nightWeight,
		weekendWeight,
		distanceWeight,
		algorithmType,
	});

	const handleWeightChange = (
		type: "night" | "weekend" | "distance" | "algorithmType",
		value: number | AlgorithmType,
	) => {
		switch (type) {
			case "night":
				setNightWeight(value as number);
				break;
			case "weekend":
				setWeekendWeight(value as number);
				break;
			case "distance":
				setDistanceWeight(value as number);
				break;
			case "algorithmType":
				setAlgorithmType(value as AlgorithmType);
				break;
		}
	};

	return (
		<div className="flex flex-col items-center">
			<h1 className="mb-4 text-2xl font-bold">Nurse Fit Rankings</h1>
			<p className="mb-6">
				Matching nurses for patient <strong>{patient.name}</strong> with needs:{" "}
				{patient.needs.join(", ")}. Distance thresholds:{" "}
				<strong>{distanceA}</strong> and <strong>{distanceB}</strong>.
			</p>

			{/* Weights Adjustment */}

			{/* Weights Adjustment */}
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
						onChange={(e) =>
							handleWeightChange("night", Number(e.target.value))
						}
						onChange={(e) =>
							handleWeightChange("night", Number(e.target.value))
						}
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
						onChange={(e) =>
							handleWeightChange("weekend", Number(e.target.value))
						}
						onChange={(e) =>
							handleWeightChange("weekend", Number(e.target.value))
						}
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
						onChange={(e) =>
							handleWeightChange("distance", Number(e.target.value))
						}
						onChange={(e) =>
							handleWeightChange("distance", Number(e.target.value))
						}
						className="w-full"
					/>
				</div>
				<div className="mt-4">
					<label className="mb-2 block">Algorithm Type:</label>
					<select
						value={algorithmType}
						onChange={(e) =>
							handleWeightChange(
								"algorithmType",
								e.target.value as AlgorithmType,
							)
						}
						className="h-10 w-full rounded-md bg-neutral-900 px-4 py-2 text-neutral-50 ring-offset-white transition-colors hover:bg-neutral-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:ring-offset-neutral-950 dark:hover:bg-neutral-50/90 dark:focus-visible:ring-neutral-300 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
					>
						<option value="MCDM">MCDM Algorithm</option>
						<option value="GREEDY">Greedy Algorithm</option>
					</select>
				</div>
			</div>

			{/* Checkboxes to filter nurses */}

			{/* Checkboxes to filter nurses */}
			<div className="mb-6">
				<h2 className="mb-4 text-xl font-semibold">Filter Nurses</h2>
				<div className="mb-4">
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
						onChange={() =>
							setShowPartiallyMeetsNeeds(!showPartiallyMeetsNeeds)
						}
					/>
					<label className="ml-2">Show nurses that partially meet needs</label>
				</div>
				<div className="mb-4">
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

			<NursesPanel
				nurses={nursesData ?? []}
				patientName={patient.name}
				isLoading={isLoading}
				error={error}
				showMeetsAllNeeds={showMeetsAllNeeds}
				showPartiallyMeetsNeeds={showPartiallyMeetsNeeds}
				showOutOfBounds={showOutOfBounds}
			/>
		</div>
	);
}
