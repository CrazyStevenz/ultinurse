import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
// import { patients } from "@/server/db/schema";  // Commented out database schemas
// import { caregivers } from "@/server/db/schema"; // Commented out database schemas

const DISTANCE_A = 5;
const DISTANCE_B = 15;

type Weights = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
};

type MockNurses = {
	name: string;
	competencies: string[];
	distance: number;
	prefersDays: boolean;
	prefersWeekdays: boolean;
};

type MockPatient = {
	name: string;
	needs: string[];
	needsNight: boolean;
	needsWeekend: boolean;
};

const MOCK_PATIENT: MockPatient = {
	name: "P1",
	needs: ["A"],
	needsNight: false,
	needsWeekend: true,
};

const MOCK_NURSES: MockNurses[] = [
	{
		name: "N1",
		competencies: ["A", "C", "E"],
		distance: 1,
		prefersDays: true,
		prefersWeekdays: false,
	},
	{
		name: "N2",
		competencies: ["B", "D", "F"],
		distance: 3,
		prefersDays: false,
		prefersWeekdays: true,
	},
	{
		name: "N3",
		competencies: ["A", "B", "C"],
		distance: 4,
		prefersDays: true,
		prefersWeekdays: true,
	},
	{
		name: "N4",
		competencies: ["F", "C", "D"],
		distance: 5,
		prefersDays: false,
		prefersWeekdays: false,
	},
	{
		name: "N5",
		competencies: ["B", "A", "D"],
		distance: 10,
		prefersDays: true,
		prefersWeekdays: false,
	},
	{
		name: "N6",
		competencies: ["E", "A", "F"],
		distance: 2,
		prefersDays: false,
		prefersWeekdays: true,
	},
	{
		name: "N7",
		competencies: ["B", "A", "C"],
		distance: 15,
		prefersDays: true,
		prefersWeekdays: true,
	},
	{
		name: "N8",
		competencies: ["D", "E", "F"],
		distance: 23,
		prefersDays: false,
		prefersWeekdays: false,
	},
	{
		name: "N9",
		competencies: ["E", "A", "B"],
		distance: 8,
		prefersDays: false,
		prefersWeekdays: true,
	},
	{
		name: "N10",
		competencies: ["D", "A", "E"],
		distance: 7,
		prefersDays: true,
		prefersWeekdays: false,
	},
];

type NurseData = {
	name: string;
	percentage: number;
	distance: number;
	meetsAllNeeds: boolean;
	outOfBounds: boolean;
	optimalDistance: boolean;
	nightShiftEligible: boolean;
	weekendShiftEligible: boolean;
};

const AlgorithmType = {
	MCDM: "MCDM",
	GREEDY: "GREEDY",
} as const;
export type AlgorithmType = keyof typeof AlgorithmType;

// MCDM Algorithm
function rankNursesMCDM(
	nurses: MockNurses[],
	patient: MockPatient,
	weights: Weights,
	distanceA: number,
	distanceB: number,
): NurseData[] {
	const nurseScores = nurses.map((nurse) => {
		const matchingCompetencies = nurse.competencies.filter((c) =>
			patient.needs.includes(c),
		).length;
		let score = matchingCompetencies * 20;
		let optimalDistance = false;
		let outOfBounds = false;

		if (nurse.distance < distanceA) {
			score += 10;
			optimalDistance = true;
		} else if (nurse.distance >= distanceA && nurse.distance <= distanceB) {
			score -= (nurse.distance - distanceA) * weights.distanceWeight;
		} else {
			score -= 100;
			outOfBounds = true;
		}

		const nightShiftEligible = !nurse.prefersDays;
		const weekendShiftEligible = !nurse.prefersWeekdays;

		if (patient.needsNight === nightShiftEligible) {
			score += weights.nightWeight * 5;
		}
		if (patient.needsWeekend === weekendShiftEligible) {
			score += weights.weekendWeight * 5;
		}

		return {
			name: nurse.name,
			score,
			distance: nurse.distance,
			meetsAllNeeds: nurse.competencies.some((c) => patient.needs.includes(c)),
			outOfBounds,
			optimalDistance,
			nightShiftEligible,
			weekendShiftEligible,
		};
	});

	const maxScore = Math.max(...nurseScores.map((nurse) => nurse.score));

	return nurseScores
		.map((nurse) => ({
			...nurse,
			percentage: maxScore > 0 ? (nurse.score / maxScore) * 100 : 0,
		}))
		.sort((a, b) => b.percentage - a.percentage);
}

// Greedy Algorithm
function rankNursesGreedy(
	nurses: MockNurses[],
	patient: MockPatient,
	weights: Weights,
	distanceB: number,
): NurseData[] {
	const nurseScores = nurses
		.filter((nurse) =>
			nurse.competencies.some((c) => patient.needs.includes(c)),
		)
		.map((nurse) => {
			const outOfBounds = nurse.distance > distanceB;
			const optimalDistance = nurse.distance < DISTANCE_A;
			const nightShiftEligible = !nurse.prefersDays;
			const weekendShiftEligible = !nurse.prefersWeekdays;

			let score = 0;

			// Greedy choice 1: distance
			if (nurse.distance < DISTANCE_A) {
				score += 10; // Prioritize nurses who are within the optimal distance
			} else if (nurse.distance <= DISTANCE_B) {
				score += 5; // Penalize those farther away but within acceptable range
			} else {
				score -= 10; // Penalize those out of bounds
			}

			// Greedy choice 2: Night shift eligibility
			if (patient.needsNight && nightShiftEligible) {
				score += weights.nightWeight * 5;
			}

			// Greedy choice 3: Weekend shift eligibility
			if (patient.needsWeekend && weekendShiftEligible) {
				score += weights.weekendWeight * 5;
			}

			// Return a structured score with additional data
			return {
				name: nurse.name,
				score,
				distance: nurse.distance,
				meetsAllNeeds: nurse.competencies.every((c) =>
					patient.needs.includes(c),
				),
				outOfBounds,
				optimalDistance,
				nightShiftEligible,
				weekendShiftEligible,
			};
		});

	// Normalize and sort the scores based on the highest score
	const maxScore = Math.max(...nurseScores.map((nurse) => nurse.score));
	return nurseScores
		.map((nurse) => ({
			...nurse,
			percentage: maxScore > 0 ? (nurse.score / maxScore) * 100 : 0,
		}))
		.sort((a, b) => b.percentage - a.percentage); // Sort in descending order of score
}

// Handle algorithm type selection
function getNursesSortedByFit(
	patient: MockPatient,
	nurses: MockNurses[],
	weights: Weights,
	algorithmType: AlgorithmType,
): NurseData[] {
	// If the patient has only one need and it's defined, filter out nurses who don't meet it
	if (patient.needs.length === 1 && patient.needs[0]) {
		const singleNeed = patient.needs[0];
		nurses = nurses.filter((nurse) => nurse.competencies.includes(singleNeed));
	}

	switch (algorithmType) {
		case "MCDM":
			return rankNursesMCDM(nurses, patient, weights, DISTANCE_A, DISTANCE_B);
		case "GREEDY":
			return rankNursesGreedy(nurses, patient, weights, DISTANCE_B);
	}
}

export const algorithmRouter = createTRPCRouter({
	read: protectedProcedure
		.input(
			z.object({
				nightWeight: z.number().min(0).max(5),
				weekendWeight: z.number().min(0).max(5),
				distanceWeight: z.number().min(0).max(5),
				algorithmType: z.nativeEnum(AlgorithmType),
			}),
		)
		.query(({ input }) => {
			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			return getNursesSortedByFit(
				MOCK_PATIENT,
				MOCK_NURSES,
				weights,
				input.algorithmType,
			);
		}),
});
