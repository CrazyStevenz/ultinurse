import { number, z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { patients } from "@/server/db/schema";
import { caregivers } from "@/server/db/schema";

const distanceA = 5;
const distanceB = 15;

type Weights = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
};

let weights: Weights = {
	nightWeight: 1,
	weekendWeight: 1,
	distanceWeight: 1,
};

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

const MockPatients: MockPatient = {
	name: "P1",
	needs: ["A", "C", "B"],
};

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
	allNurses: MockNurses[],
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

	// Calculate the weighted fit for the current nurse
	const currentFit =
		(needsFit +
			nightFit * nightWeight +
			weekendFit * weekendWeight +
			distanceFit * distanceWeight) /
		(1 + nightWeight + weekendWeight + distanceWeight);

	// Find the maximum fit percentage from all nurses
	const maxFit = Math.max(
		...allNurses.map((n) => {
			const totalNeeds = patient.needs.length;
			const matchedNeeds = n.competencies.filter((competency) =>
				patient.needs.includes(competency),
			).length;

			const needsFit = (matchedNeeds / totalNeeds) * 100;

			const nightFit = n.worksNights ? 100 : 0;
			const weekendFit = n.worksWeekends ? 100 : 0;

			const distanceFit =
				n.distance <= distanceA ? 100 - (n.distance / distanceA) * 100 : 0;

			return (
				(needsFit +
					nightFit * nightWeight +
					weekendFit * weekendWeight +
					distanceFit * distanceWeight) /
				(1 + nightWeight + weekendWeight + distanceWeight)
			);
		}),
	);

	// Normalize the current fit based on the maximum fit, scaling it to a percentage of 100
	return (currentFit / maxFit) * 100;
}

function nurseMeetsAllNeeds(patient: MockPatient, nurse: MockNurses): boolean {
	return patient.needs.every((need) => nurse.competencies.includes(need));
}

function getNursesSortedByFit(
	patient: MockPatient,
	nurses: MockNurses[],
	weights: Weights,
	algorithmType: string,
) {
	return nurses
		.map((nurse) => ({
			name: nurse.name,
			percentage: calculateFitPercentage(
				patient,
				nurse,
				weights.nightWeight,
				weights.weekendWeight,
				weights.distanceWeight,
				distanceA,
				MockNurses,
			),
			distance: nurse.distance,
			meetsAllNeeds: nurseMeetsAllNeeds(patient, nurse),
			outOfBounds: nurse.distance > distanceB,
		}))
		.sort((a, b) => b.percentage - a.percentage);
}

const AlgorithmType = {
	HUNGARIAN: "HUNGARIAN",
	GREEDY: "GREEDY",
} as const;

export const hungarianRouter = createTRPCRouter({
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
