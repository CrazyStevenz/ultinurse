/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { patients } from "../../db/schema.ts"; // Commented out database schemas
import { caregivers } from "../../db/schema.ts"; // Commented out database schemas
import { sql } from "drizzle-orm";

const DISTANCE_A = 5;
const DISTANCE_B = 15;

type Weights = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
};

type Caregivers = {
	name: string;
	skills: number[];
	distance: number;
	prefersNights: boolean;
	prefersWeekends: boolean;
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
	needs: number[];
	needsNight: boolean;
	needsWeekend: boolean;
};

const MOCK_PATIENT: MockPatient = {
	name: "P1",
	needs: [1],
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
	caregivers: Caregivers[],
	patient: MockPatient,
	weights: Weights,
	distanceA: number,
	distanceB: number,
): NurseData[] {
	const caregiverScores = caregivers.map((caregiver) => {
		const matchingCompetencies = caregiver.skills.filter((c) =>
			patient.needs.includes(c),
		).length;
		let score = matchingCompetencies * 20;
		let optimalDistance = false;
		let outOfBounds = false;

		if (caregiver.distance < distanceA) {
			score += 10;
			optimalDistance = true;
		} else if (
			caregiver.distance >= distanceA &&
			caregiver.distance <= distanceB
		) {
			score -= (caregiver.distance - distanceA) * weights.distanceWeight;
		} else {
			score -= 100;
			outOfBounds = true;
		}

		const nightShiftEligible = !caregiver.prefersNights;
		const weekendShiftEligible = !caregiver.prefersWeekends;

		if (patient.needsNight === nightShiftEligible) {
			score += weights.nightWeight * 5;
		}
		if (patient.needsWeekend === weekendShiftEligible) {
			score += weights.weekendWeight * 5;
		}

		return {
			name: caregiver.name,
			score,
			distance: caregiver.distance,
			meetsAllNeeds: caregiver.skills.some((c) => patient.needs.includes(c)),
			outOfBounds,
			optimalDistance,
			nightShiftEligible,
			weekendShiftEligible,
		};
	});

	const maxScore = Math.max(...caregiverScores.map((n) => n.score));

	return caregiverScores
		.map((n) => ({
			...n,
			percentage:
				maxScore > 0 ? Math.round((n.score / maxScore) * 1000) / 10 : 0, // rounded to 1 decimal
		}))
		.sort((a, b) => b.percentage - a.percentage);
}

// Greedy Algorithm
function rankNursesGreedy(
	caregivers: Caregivers[],
	patient: MockPatient,
	weights: Weights,
	distanceB: number,
): NurseData[] {
	const caregiverScores = caregivers
		.filter((caregiver) =>
			caregiver.skills.some((c) => patient.needs.includes(c)),
		)
		.map((caregiver) => {
			const outOfBounds = caregiver.distance > distanceB;
			const optimalDistance = caregiver.distance < DISTANCE_A;
			const nightShiftEligible = caregiver.prefersNights;
			const weekendShiftEligible = caregiver.prefersWeekends;

			let score = 0;

			// Greedy choice 1: distance
			if (caregiver.distance < DISTANCE_A) {
				score += 10;
			} else if (caregiver.distance <= DISTANCE_B) {
				score += 5;
			} else {
				score -= 10;
			}

			// Greedy choice 2: Night shift eligibility
			if (patient.needsNight && nightShiftEligible) {
				score += weights.nightWeight * 5;
			}

			// Greedy choice 3: Weekend shift eligibility
			if (patient.needsWeekend && weekendShiftEligible) {
				score += weights.weekendWeight * 5;
			}

			return {
				name: caregiver.name,
				score,
				distance: caregiver.distance,
				meetsAllNeeds: caregiver.skills.every((c) => patient.needs.includes(c)),
				outOfBounds,
				optimalDistance,
				nightShiftEligible,
				weekendShiftEligible,
			};
		});

	const maxScore = Math.max(...caregiverScores.map((n) => n.score));

	return caregiverScores
		.map((n) => ({
			...n,
			percentage:
				maxScore > 0 ? Math.round((n.score / maxScore) * 1000) / 10 : 0,
		}))
		.sort((a, b) => b.percentage - a.percentage);
}

// Handle algorithm type selection
function getNursesSortedByFit(
	patient: MockPatient,
	caregiversWithDistance: Caregivers[],
	weights: Weights,
	algorithmType: AlgorithmType,
): NurseData[] {
	// If the patient has only one need and it's defined, filter out nurses who don't meet it
	if (patient.needs.length === 1 && patient.needs[0]) {
		const singleNeed = patient.needs[0];
		caregiversWithDistance = caregiversWithDistance.filter((caregivers) =>
			caregivers.skills.includes(singleNeed),
		);
	}

	switch (algorithmType) {
		case "MCDM":
			return rankNursesMCDM(
				caregiversWithDistance,
				patient,
				weights,
				DISTANCE_A,
				DISTANCE_B,
			);
		case "GREEDY":
			return rankNursesGreedy(
				caregiversWithDistance,
				patient,
				weights,
				DISTANCE_B,
			);
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
		.query(async ({ ctx, input }) => {
			// Step 1: Retrieve the patient's location
			const singlePatient = await ctx.db
				.select({
					id: patients.id,
					name: patients.name,
					location: patients.location,
				})
				.from(patients)
				.limit(1);

			if (!singlePatient.length) {
				throw new Error("No patient found.");
			}

			const patientPoint = singlePatient[0]?.location;
			if (!patientPoint) {
				throw new Error("No patient location found.");
			}

			const patientLocationResult = await ctx.db
				.select({
					location: sql<string>`ST_AsText(${patients.location})`, // Convert to WKT format
				})
				.from(patients)
				.limit(1);

			const patientPointWKT = patientLocationResult[0]?.location;
			if (!patientPointWKT) {
				throw new Error("No patient location found.");
			}

			const caregiversWithDistance = await ctx.db
				.select({
					id: caregivers.id,
					name: caregivers.name,
					prefersNights: caregivers.prefersNights,
					prefersWeekends: caregivers.prefersWeekends,
					skills: caregivers.skills,
					location: caregivers.location,
					distance: sql<number>`ROUND(
					(ST_Distance(
						ST_GeomFromText(${patientPointWKT}, 4326)::geography,
						${caregivers.location}::geography
					) / 1000)::numeric,
					1
				)`,
				})
				.from(caregivers);

			// Step 3: Define weights and pass to sorting function
			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			return getNursesSortedByFit(
				MOCK_PATIENT,
				caregiversWithDistance,
				weights,
				input.algorithmType,
			);
		}),
});
