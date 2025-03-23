import { number, z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
// import { patients } from "@/server/db/schema";  // Commented out database schemas
// import { caregivers } from "@/server/db/schema"; // Commented out database schemas

const distanceA = 5;
const distanceB = 15;

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

const MockPatients: MockPatient = {
	name: "P1",
	needs: ["A"],
	needsNight: false,
	needsWeekend: true,
};

const MockNurses: MockNurses[] = [
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

type AlgorithmType = "MCDM" | "GREEDY";

// MCDM Algorithm
function rankNursesMCDM(
	nurses: MockNurses[],
	patient: MockPatient,
	weights: Weights,
	distanceA: number,
	distanceB: number,
): NurseData[] {
	function calculateScore(nurse: MockNurses): {
		score: number;
		outOfBounds: boolean;
		optimalDistance: boolean;
		nightShiftEligible: boolean;
		weekendShiftEligible: boolean;
	} {
		let score = 0;
		const matchingCompetencies = nurse.competencies.filter((c) =>
			patient.needs.includes(c),
		).length;
		score += matchingCompetencies * 20;

		let outOfBounds = false;
		let optimalDistance = false;

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
			score,
			outOfBounds,
			optimalDistance,
			nightShiftEligible,
			weekendShiftEligible,
		};
	}

	const nurseScores = nurses.map((nurse) => {
		const {
			score,
			outOfBounds,
			optimalDistance,
			nightShiftEligible,
			weekendShiftEligible,
		} = calculateScore(nurse);
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

// Greedy Algorithm (Sort by Distance & Competency)
function rankNursesGreedy(
	nurses: MockNurses[],
	patient: MockPatient,
	distanceB: number,
): NurseData[] {
	const nurseScores = nurses
		.filter((nurse) =>
			nurse.competencies.some((c) => patient.needs.includes(c)),
		)
		.map((nurse) => {
			const outOfBounds = nurse.distance > distanceB;
			const optimalDistance = nurse.distance < distanceA;
			const nightShiftEligible = !nurse.prefersDays;
			const weekendShiftEligible = !nurse.prefersWeekdays;

			return {
				name: nurse.name,
				score: 100 - nurse.distance,
				distance: nurse.distance,
				meetsAllNeeds: nurse.competencies.some((c) =>
					patient.needs.includes(c),
				),
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

//  Handle algorithm type selection
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

	if (algorithmType === "MCDM") {
		return rankNursesMCDM(nurses, patient, weights, distanceA, distanceB);
	} else if (algorithmType === "GREEDY") {
		return rankNursesGreedy(nurses, patient, distanceB);
	} else {
		throw new Error(`Unsupported algorithm type`);
	}
}

export const algorithmRouter = createTRPCRouter({
	read: protectedProcedure
		.input(
			z.object({
				nightWeight: z.number().min(0).max(5),
				weekendWeight: z.number().min(0).max(5),
				distanceWeight: z.number().min(0).max(5),
				algorithmType: z.enum(["MCDM", "GREEDY"]),
			}),
		)
		.query(({ input }) => {
			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			return getNursesSortedByFit(
				MockPatients,
				MockNurses,
				weights,
				input.algorithmType,
			);
		}),
});
