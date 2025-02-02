"use client";

import { useState } from "react";

type MockNurses = {
	name: string;
	competencies: string[];
	distance: number;
	worksNights: boolean;
	worksWeekends: boolean;
};

type MockPatient = {
	name: string;
	needs: string[];
};

const MockPatients: [MockPatient, ...MockPatient[]] = [
	{
		name: "P1",
		needs: ["A", "C", "B"],
	},
];

const MockNurses: MockNurses[] = [
	{
		name: "N1",
		competencies: ["A", "C", "E"],
		distance: 1,
		worksNights: true,
		worksWeekends: false,
	},
	{
		name: "N2",
		competencies: ["B", "D", "F"],
		distance: 3,
		worksNights: false,
		worksWeekends: true,
	},
	{
		name: "N3",
		competencies: ["A", "B", "C"],
		distance: 4,
		worksNights: true,
		worksWeekends: true,
	},
	{
		name: "N4",
		competencies: ["F", "C", "D"],
		distance: 5,
		worksNights: false,
		worksWeekends: false,
	},
	{
		name: "N5",
		competencies: ["B", "A", "D"],
		distance: 10,
		worksNights: true,
		worksWeekends: false,
	},
	{
		name: "N6",
		competencies: ["E", "A", "F"],
		distance: 2,
		worksNights: false,
		worksWeekends: true,
	},
	{
		name: "N7",
		competencies: ["B", "A", "C"],
		distance: 15,
		worksNights: true,
		worksWeekends: true,
	},
	{
		name: "N8",
		competencies: ["D", "E", "F"],
		distance: 23,
		worksNights: false,
		worksWeekends: false,
	},
	{
		name: "N9",
		competencies: ["E", "A", "B"],
		distance: 8,
		worksNights: false,
		worksWeekends: true,
	},
	{
		name: "N10",
		competencies: ["D", "A", "E"],
		distance: 7,
		worksNights: true,
		worksWeekends: false,
	},
];

function calculateFitPercentage(
	patient: MockPatient,
	nurse: MockNurses,
	nightWeight: number,
	weekendWeight: number,
	distanceWeight: number,
	distanceA: number,
): number {
	const totalNeeds = patient.needs.length;
	const matchedNeeds = nurse.competencies.filter((competency) =>
		patient.needs.includes(competency),
	).length;

	const needsFit = (matchedNeeds / totalNeeds) * 100;

	// Night and weekend weight factors
	const nightFit = nurse.worksNights ? 100 : 0;
	const weekendFit = nurse.worksWeekends ? 100 : 0;

	// Distance fit within bounds
	const distanceFit =
		nurse.distance <= distanceA ? 100 - (nurse.distance / distanceA) * 100 : 0;

	// Calculate weighted fit
	return (
		(needsFit +
			nightFit * nightWeight +
			weekendFit * weekendWeight +
			distanceFit * distanceWeight) /
		(1 + nightWeight + weekendWeight + distanceWeight)
	);
}

function nurseMeetsAllNeeds(patient: MockPatient, nurse: MockNurses): boolean {
	return patient.needs.every((need) => nurse.competencies.includes(need));
}

function getNursesSortedByFit(
	patient: MockPatient,
	nurses: MockNurses[],
	nightWeight: number,
	weekendWeight: number,
	distanceWeight: number,
	distanceA: number,
	distanceB: number,
): {
	name: string;
	percentage: number;
	distance: number;
	meetsAllNeeds: boolean;
	outOfBounds: boolean;
}[] {
	const nurseFitScores = nurses.map((nurse) => ({
		name: nurse.name,
		percentage: calculateFitPercentage(
			patient,
			nurse,
			nightWeight,
			weekendWeight,
			distanceWeight,
			distanceA,
		),
		distance: nurse.distance,
		meetsAllNeeds: nurseMeetsAllNeeds(patient, nurse),
		outOfBounds: nurse.distance > distanceB,
	}));

	return nurseFitScores.sort((a, b) => b.percentage - a.percentage);
}

export default function Patients() {
	const patient = MockPatients[0] ?? {
		name: "Unknown Patient",
		needs: [],
	};

	const distanceA = 5;
	const distanceB = 15;

	const [nightWeight, setNightWeight] = useState(1); // Default weight for night shift
	const [weekendWeight, setWeekendWeight] = useState(1); // Default weight for weekend shift
	const [distanceWeight, setDistanceWeight] = useState(1); // Default weight for distance

	const [showMeetsAllNeeds, setShowMeetsAllNeeds] = useState(true);
	const [showPartiallyMeetsNeeds, setShowPartiallyMeetsNeeds] = useState(true);
	const [showOutOfBounds, setShowOutOfBounds] = useState(true);

	const sortedNurses = getNursesSortedByFit(
		patient,
		MockNurses,
		nightWeight,
		weekendWeight,
		distanceWeight,
		distanceA,
		distanceB,
	);

	const filteredNurses = sortedNurses.filter((nurse) => {
		if (nurse.outOfBounds && !showOutOfBounds) return false;
		if (nurse.meetsAllNeeds && !nurse.outOfBounds && !showMeetsAllNeeds)
			return false;
		if (!nurse.meetsAllNeeds && !nurse.outOfBounds && !showPartiallyMeetsNeeds)
			return false;
		return true;
	});

	return (
		<main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-black to-green-900 text-white">
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
				<div>
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
			<div className="mb-6">
				<label className="mb-2 block">
					<input
						type="checkbox"
						checked={showMeetsAllNeeds}
						onChange={(e) => setShowMeetsAllNeeds(e.target.checked)}
						className="mr-2"
					/>
					Show nurses who meet all needs
				</label>
				<label className="mb-2 block">
					<input
						type="checkbox"
						checked={showPartiallyMeetsNeeds}
						onChange={(e) => setShowPartiallyMeetsNeeds(e.target.checked)}
						className="mr-2"
					/>
					Show nurses who partially meet needs
				</label>
				<label className="block">
					<input
						type="checkbox"
						checked={showOutOfBounds}
						onChange={(e) => setShowOutOfBounds(e.target.checked)}
						className="mr-2"
					/>
					Show out-of-bounds nurses
				</label>
			</div>
			{filteredNurses.length === 0 ? (
				<p className="text-center text-red-500">
					No nurses available to meet patient {patient.name}&apos;s needs within
					the selected categories.
				</p>
			) : (
				<div className="mb-4 flex w-full justify-center">
					<ul className="w-1/2">
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
		</main>
	);
}
