"use client";

import { api } from "@/trpc/react";
import { useState, useEffect } from "react";

export default function Patients() {
	const distanceA = 5;
	const distanceB = 15;
	const patient: MockPatient = {
		name: "P1",
		needs: ["A", "C", "B"],
	};

	type MockPatient = {
		name: string;
		needs: string[];
	};

	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);

	const [showMeetsAllNeeds, setShowMeetsAllNeeds] = useState(true);
	const [showPartiallyMeetsNeeds, setShowPartiallyMeetsNeeds] = useState(true);
	const [showOutOfBounds, setShowOutOfBounds] = useState(true);

	const {
		data: nursesData,
		isLoading,
		error,
		refetch,
	} = api.hungarian.read.useQuery();

	const createWeights = api.hungarian.create.useMutation({
		onSuccess: () => {
			void refetch(); // Refetch nurses after weights update
		},
	});

	// Function to handle weight changes and trigger the mutation
	const handleWeightChange = (type: string, value: number) => {
		if (type === "night") setNightWeight(value);
		if (type === "weekend") setWeekendWeight(value);
		if (type === "distance") setDistanceWeight(value);

		createWeights.mutate({
			nightWeight: type === "night" ? value : nightWeight,
			weekendWeight: type === "weekend" ? value : weekendWeight,
			distanceWeight: type === "distance" ? value : distanceWeight,
		});
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
				<div>
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
			</div>
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
		</div>
	);
}
