/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { patients } from "../../db/schema.ts";
import { caregivers } from "../../db/schema.ts";
import { sql } from "drizzle-orm";

const DISTANCE_A = 5;
const DISTANCE_B = 15;

type Weights = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
};

type Caregiver = {
	id: number;
	name: string;
	skills: number[];
	distance: number;
	prefersNights: boolean;
	prefersWeekends: boolean;
	location: {
		latitude: number;
		longitude: number;
	};
};

type MockPatient = {
	name: string;
	needs: number[];
	needsNight: boolean;
	needsWeekend: boolean;
};

type MockShift = {
	id: number;
	patientId: number;
	patientName: string;
	startsAt: Date;
	endsAt: Date;
	isNightShift: boolean;
	isWeekendShift: boolean;
	needs: number[];
	location: {
		latitude: number;
		longitude: number;
	};
	assignedCaregiver: Caregiver | null;
};

export const MOCK_SHIFTS: MockShift[] = [
	{
		id: 1,
		patientId: 1,
		startsAt: new Date("2025-04-19T08:00:00"),
		endsAt: new Date("2025-04-19T16:00:00"),
		isNightShift: false,
		isWeekendShift: true,
		needs: [1],
		location: { latitude: 40.59531259054391, longitude: 22.946153826937028 },
		assignedCaregiver: null,
		patientName: "",
	},
	{
		id: 2,
		patientId: 1,
		startsAt: new Date("2025-04-20T22:00:00"),
		endsAt: new Date("2025-04-21T06:00:00"),
		isNightShift: true,
		isWeekendShift: true,
		needs: [2, 4],
		location: { latitude: 40.694887059702275, longitude: 22.94735529918021 },
		assignedCaregiver: null,
		patientName: "",
	},
	{
		id: 3,
		patientId: 2,
		startsAt: new Date("2025-04-21T14:00:00"),
		endsAt: new Date("2025-04-21T22:00:00"),
		isNightShift: false,
		isWeekendShift: false,
		needs: [3],
		location: { latitude: 40.61150563186957, longitude: 22.947786135463662 },
		assignedCaregiver: null,
		patientName: "",
	},
	{
		id: 4,
		patientId: 2,
		startsAt: new Date("2025-04-21T23:00:00"),
		endsAt: new Date("2025-04-22T07:00:00"),
		isNightShift: true,
		isWeekendShift: false,
		needs: [1, 5],
		location: { latitude: 40.635793320692315, longitude: 22.948060146714177 },
		assignedCaregiver: null,
		patientName: "",
	},
	{
		id: 5,
		patientId: 3,
		startsAt: new Date("2025-04-18T10:00:00"),
		endsAt: new Date("2025-04-18T18:00:00"),
		isNightShift: false,
		isWeekendShift: false,
		needs: [2],
		location: { latitude: 40.550989807139686, longitude: 22.947228925873333 },
		assignedCaregiver: null,
		patientName: "",
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

function rankNursesMCDM(
	caregivers: Caregiver[],
	patient: MockShift,
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

		if (patient.isNightShift === nightShiftEligible) {
			score += weights.nightWeight * 5;
		}
		if (patient.isWeekendShift === weekendShiftEligible) {
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
				maxScore > 0 ? Math.round((n.score / maxScore) * 1000) / 10 : 0,
		}))
		.sort((a, b) => b.percentage - a.percentage);
}

function rankNursesGreedy(
	caregivers: Caregiver[],
	patient: MockShift,
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

			if (caregiver.distance < DISTANCE_A) {
				score += 10;
			} else if (caregiver.distance <= DISTANCE_B) {
				score += 5;
			} else {
				score -= 10;
			}

			if (patient.isNightShift && nightShiftEligible) {
				score += weights.nightWeight * 5;
			}

			if (patient.isWeekendShift && weekendShiftEligible) {
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

function getNursesSortedByFit(
	patient: MockShift,
	caregiversWithDistance: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
): NurseData[] {
	if (patient.needs.length === 1 && patient.needs[0]) {
		const singleNeed = patient.needs[0];
		caregiversWithDistance = caregiversWithDistance.filter((caregiver) =>
			caregiver.skills.includes(singleNeed),
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

function calculateHaversineDistance(
	point1: { latitude: number; longitude: number },
	point2: { latitude: number; longitude: number },
): number {
	const R = 6371;
	const dLat = (point2.latitude - point1.latitude) * (Math.PI / 180);
	const dLon = (point2.longitude - point1.longitude) * (Math.PI / 180);
	const lat1 = point1.latitude * (Math.PI / 180);
	const lat2 = point2.latitude * (Math.PI / 180);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Number((R * c).toFixed(1));
}

function parseLocation(wkt: string): { latitude: number; longitude: number } {
	const match = /POINT\(([\d.]+) ([\d.]+)\)/.exec(wkt);
	if (!match) throw new Error("Invalid location format");

	const longitude = parseFloat(match[1]!);
	const latitude = parseFloat(match[2]!);

	return { latitude, longitude };
}

function assignCaregiversToShifts(
	shifts: MockShift[],
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
): MockShift[] {
	const assignedCaregivers = new Set<number>();

	return shifts.map((shift) => {
		const availableCaregivers = caregivers.filter(
			(caregiver) => !assignedCaregivers.has(caregiver.id),
		);

		const caregiversWithDistance = availableCaregivers.map((caregiver) => ({
			...caregiver,
			distance: parseFloat(
				calculateHaversineDistance(caregiver.location, shift.location).toFixed(
					1,
				),
			),
		}));

		const rankedNurses = getNursesSortedByFit(
			shift,
			caregiversWithDistance,
			weights,
			algorithmType,
		);

		const topRanked = rankedNurses[0];
		const bestCaregiver = topRanked
			? (caregiversWithDistance.find((cg) => cg.name === topRanked.name) ??
				null)
			: null;

		if (bestCaregiver) {
			assignedCaregivers.add(bestCaregiver.id);
		}

		return {
			...shift,
			assignedCaregiver: bestCaregiver,
		};
	});
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
			const singlePatient = await ctx.db
				.select({
					id: patients.id,
					name: patients.name,
					location: patients.location,
				})
				.from(patients)
				.limit(1);

			if (!singlePatient.length) throw new Error("No patient found.");

			const patientPoint = singlePatient[0]?.location;
			if (!patientPoint) throw new Error("No patient location found.");

			const patientLocationResult = await ctx.db
				.select({
					location: sql<string>`ST_AsText(${patients.location})`,
				})
				.from(patients)
				.limit(1);

			const patientPointWKT = patientLocationResult[0]?.location;
			if (!patientPointWKT) throw new Error("No patient location found.");

			const caregiversWithDistanceRaw = await ctx.db
				.select({
					id: caregivers.id,
					name: caregivers.name,
					prefersNights: caregivers.prefersNights,
					prefersWeekends: caregivers.prefersWeekends,
					skills: caregivers.skills,
					locationWKT: sql<string>`ST_AsText(${caregivers.location})`,
					distance: sql<number>`ST_DistanceSphere(
						ST_GeomFromText(${patientPointWKT}),
						${caregivers.location}
					) / 1000`,
				})
				.from(caregivers);

			const caregiversWithDistance: Caregiver[] = caregiversWithDistanceRaw.map(
				(cg) => {
					const parsedLocation = parseLocation(cg.locationWKT);
					return {
						id: cg.id,
						name: cg.name,
						prefersNights: cg.prefersNights,
						prefersWeekends: cg.prefersWeekends,
						skills: cg.skills,
						location: parsedLocation,
						distance: parseFloat(cg.distance.toFixed(1)),
					};
				},
			);

			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};
			const selectedShift = MOCK_SHIFTS[0];
			if (!selectedShift) throw new Error("No shifts available.");

			return getNursesSortedByFit(
				selectedShift,
				caregiversWithDistance,
				weights,
				input.algorithmType,
			);
		}),

	getShifts: protectedProcedure
		.input(
			z.object({
				nightWeight: z.number().min(0).max(5),
				weekendWeight: z.number().min(0).max(5),
				distanceWeight: z.number().min(0).max(5),
				algorithmType: z.nativeEnum(AlgorithmType),
			}),
		)
		.query(async ({ ctx, input }) => {
			const caregiversWithLocation = await ctx.db
				.select({
					id: caregivers.id,
					name: caregivers.name,
					prefersNights: caregivers.prefersNights,
					prefersWeekends: caregivers.prefersWeekends,
					skills: caregivers.skills,
					locationWKT: sql<string>`ST_AsText(${caregivers.location})`,
				})
				.from(caregivers);

			const baseCaregivers: Caregiver[] = caregiversWithLocation.map((cg) => {
				const parsedLocation = parseLocation(cg.locationWKT);
				return {
					id: cg.id,
					name: cg.name,
					prefersNights: cg.prefersNights,
					prefersWeekends: cg.prefersWeekends,
					skills: cg.skills,
					location: parsedLocation,
					distance: 0,
				};
			});

			const weights: Weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			const updatedShifts = assignCaregiversToShifts(
				MOCK_SHIFTS,
				baseCaregivers,
				weights,
				input.algorithmType,
			);

			return updatedShifts;
		}),
});
