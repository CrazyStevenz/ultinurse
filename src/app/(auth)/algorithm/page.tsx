"use client";
import { api } from "@/trpc/react";
import { useState } from "react";
import NursesPanel from "./nursesPanel";

type MockPatient = {
	name: string;
	needs: string[];
};

type AlgorithmType = "HUNGARIAN" | "GREEDY";

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
		needs: ["A", "C", "B"],
	};

	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);
	const [algorithmType, setAlgorithmType] =
		useState<AlgorithmType>("HUNGARIAN");
	const [showMeetsAllNeeds, setShowMeetsAllNeeds] = useState(true);
	const [showPartiallyMeetsNeeds, setShowPartiallyMeetsNeeds] = useState(true);
	const [showOutOfBounds, setShowOutOfBounds] = useState(true);

	const {
		data: nursesData,
		isLoading,
		error,
	} = api.hungarian.read.useQuery({
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

	const filteredNurses =
		nursesData?.filter((nurse) => {
			if (nurse.outOfBounds && !showOutOfBounds) return false;
			if (nurse.meetsAllNeeds && !nurse.outOfBounds && !showMeetsAllNeeds)
				return false;
			if (
				!nurse.meetsAllNeeds &&
				!nurse.outOfBounds &&
				!showPartiallyMeetsNeeds
			)
				return false;
			return true;
		}) ?? [];

	if (isLoading) {
		return <p>Loading nurses...</p>;
	}

	if (error) {
		return <p>Error loading nurses: {error.message}</p>;
	}

	return (
		<div className="flex flex-col items-center">
			<h1 className="mb-4 text-2xl font-bold">Nurse Fit Rankings</h1>
			<p className="mb-6">
				Matching nurses for patient <strong>{patient.name}</strong> with needs:{" "}
				{patient.needs.join(", ")}. Distance thresholds:{" "}
				<strong>{distanceA}</strong> and <strong>{distanceB}</strong>.
			</p>

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
						className="w-full rounded border p-2"
					>
						<option value="HUNGARIAN">Hungarian Algorithm</option>
						<option value="GREEDY">Greedy Algorithm</option>
					</select>
				</div>
			</div>

			{/* Checkboxes to filter nurses */}
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

			{/* Display nurses */}
			{filteredNurses.length === 0 ? (
				<p className="text-center text-red-500">
					No nurses available to meet patient {patient.name}&apos;s needs within
					the selected categories.
				</p>
			) : (
				<div className="mb-4 flex w-full justify-center">
					<ul className="w-full md:w-1/2">
						{filteredNurses.map((nurse, index) => (
							<li
								key={nurse.name}
								className={`flex flex-col py-4 first:rounded-t-sm last:rounded-b-sm ${
									nurse.outOfBounds
										? "bg-gray-700 text-gray-400"
										: nurse.meetsAllNeeds
											? "bg-green-200 text-black"
											: "bg-yellow-100 text-black"
								}`}
							>
								<div className="flex justify-between px-4">
									<span>
										{index + 1}. {nurse.name}
									</span>
									<span>{nurse.percentage.toFixed(1)}%</span>
								</div>
								<div className="flex justify-between px-4">
									<span>Distance: {nurse.distance}</span>
									<span>
										{nurse.meetsAllNeeds
											? "Meets all needs"
											: "Partially meets needs"}
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
			<NursesPanel nurses={filteredNurses} patientName={patient.name} />
		</div>
	);
}
