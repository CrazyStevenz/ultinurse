import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers, patients, shifts } from "../../db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { isNightShift, isWeekendShift } from "./shift";

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

const MOCK_SHIFTS: MockShift[] = [
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
	id: number;
	name: string;
	score: number;
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

const GlobalAlgorithmType = {
	NONE: "NONE",
	KNAPSACK: "KNAPSACK",
} as const;

export type AlgorithmType = keyof typeof AlgorithmType;
export type GlobalAlgorithmType = keyof typeof GlobalAlgorithmType;

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

function normalizeScores<T extends { score: number }>(
	nurses: T[],
): (T & { percentage: number })[] {
	const maxScore = Math.max(...nurses.map((n) => n.score));
	return nurses.map((n) => ({
		...n,
		percentage: maxScore > 0 ? Math.round((n.score / maxScore) * 1000) / 10 : 0,
	}));
}

function rankNursesMCDM(
	caregivers: Caregiver[],
	patient: MockShift,
	weights: Weights,
	distanceA: number,
	distanceB: number,
): Omit<NurseData, "percentage">[] {
	return caregivers.map((caregiver) =>
		calculateFitScoreMCDM(caregiver, patient, weights, distanceA, distanceB),
	);
}

function rankNursesGreedy(
	caregivers: Caregiver[],
	patient: MockShift,
	weights: Weights,
	distanceB: number,
): Omit<NurseData, "percentage">[] {
	return caregivers
		.filter((caregiver) =>
			caregiver.skills.some((c) => patient.needs.includes(c)),
		)
		.map((caregiver) =>
			calculateFitScoreGreedy(caregiver, patient, weights, distanceB),
		);
}

function calculateFitScoreMCDM(
	caregiver: Caregiver,
	patient: MockShift,
	weights: Weights,
	distanceA: number,
	distanceB: number,
): Omit<NurseData, "percentage"> {
	const matchingCompetencies = caregiver.skills.filter((c) =>
		patient.needs.includes(c),
	).length;
	let score = matchingCompetencies * 20;
	let optimalDistance = false;
	let outOfBounds = false;

	if (caregiver.distance < distanceA) {
		score += 10;
		optimalDistance = true;
	} else if (caregiver.distance <= distanceB) {
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
		id: caregiver.id,
		name: caregiver.name,
		score,
		distance: caregiver.distance,
		meetsAllNeeds: caregiver.skills.some((c) => patient.needs.includes(c)),
		outOfBounds,
		optimalDistance,
		nightShiftEligible,
		weekendShiftEligible,
	};
}

function calculateFitScoreGreedy(
	caregiver: Caregiver,
	patient: MockShift,
	weights: Weights,
	distanceB: number,
): Omit<NurseData, "percentage"> {
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
		id: caregiver.id,
		name: caregiver.name,
		score,
		distance: caregiver.distance,
		meetsAllNeeds: caregiver.skills.every((c) => patient.needs.includes(c)),
		outOfBounds,
		optimalDistance,
		nightShiftEligible,
		weekendShiftEligible,
	};
}

function assignCaregiversWithKnapsack(
	shifts: MockShift[],
	caregivers: Caregiver[],
	weights: Weights,
): MockShift[] {
	if (shifts.length === 0) {
		console.warn("No shifts available to assign caregivers.");
		return [];
	}

	const allPairs: {
		shift: MockShift;
		caregiver: Caregiver;
		score: number;
	}[] = [];

	// Normalize caregivers' scores before pairing
	const normalizedCaregivers = caregivers.map((caregiver) => {
		const distance = calculateHaversineDistance(
			caregiver.location,
			shifts[0]!.location,
		);
		const caregiverWithDistance = { ...caregiver, distance };

		// Get ranking score using the normalized approach
		const [ranked] = getNursesSortedByFit(
			shifts[0]!,
			[caregiverWithDistance],
			weights,
			"MCDM",
		);

		return {
			...caregiverWithDistance,
			score: ranked?.percentage ?? 0, // Default to 0 if no score found
		};
	});

	// Generate all possible pairs of shifts and caregivers, then rank by score
	for (const shift of shifts) {
		for (const caregiver of normalizedCaregivers) {
			const distance = calculateHaversineDistance(
				caregiver.location,
				shift.location,
			);
			const caregiverWithDistance = { ...caregiver, distance };

			const [ranked] = getNursesSortedByFit(
				shift,
				[caregiverWithDistance],
				weights,
				"MCDM",
			);

			if (ranked && ranked.percentage > 0) {
				allPairs.push({
					shift,
					caregiver: caregiverWithDistance,
					score: ranked.percentage, // Using pre-normalized score
				});
			}
		}
	}

	// Sort pairs by score in descending order (higher scores first)
	allPairs.sort((a, b) => b.score - a.score);

	const assignedCaregivers = new Set<number>(); // Track which caregivers have been assigned
	const assignedShifts = new Set<number>(); // Track which shifts have been assigned
	const result: MockShift[] = shifts.map((s) => ({
		...s,
		assignedCaregiver: null,
	}));

	// First pass: Assign caregivers to shifts based on the highest score
	for (const { shift, caregiver } of allPairs) {
		if (
			!assignedCaregivers.has(caregiver.id) &&
			!assignedShifts.has(shift.id)
		) {
			assignedCaregivers.add(caregiver.id);
			assignedShifts.add(shift.id);

			const index = result.findIndex((s) => s.id === shift.id);
			const targetShift = result[index];
			if (!targetShift) continue;
			targetShift.assignedCaregiver = caregiver;
		}
	}

	// Second pass: Ensure every shift gets assigned a caregiver
	for (const shift of shifts) {
		if (!assignedShifts.has(shift.id)) {
			// Find the next best available caregiver
			for (const caregiver of normalizedCaregivers) {
				if (!assignedCaregivers.has(caregiver.id)) {
					assignedCaregivers.add(caregiver.id);
					assignedShifts.add(shift.id);

					const index = result.findIndex((s) => s.id === shift.id);
					const targetShift = result[index];
					if (!targetShift) continue;
					targetShift.assignedCaregiver = caregiver;
					break; // Move on to the next unassigned shift
				}
			}
		}
	}

	return result;
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

	let scoredCaregivers: Omit<NurseData, "percentage">[];

	switch (algorithmType) {
		case "MCDM":
			scoredCaregivers = rankNursesMCDM(
				caregiversWithDistance,
				patient,
				weights,
				DISTANCE_A,
				DISTANCE_B,
			);
			break;
		case "GREEDY":
			scoredCaregivers = rankNursesGreedy(
				caregiversWithDistance,
				patient,
				weights,
				DISTANCE_B,
			);
			break;
	}

	return normalizeScores(scoredCaregivers).sort(
		(a, b) => b.percentage - a.percentage,
	);
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
	globalAlgorithmType: GlobalAlgorithmType,
): MockShift[] {
	const assignedCaregivers = new Set<number>();

	if (globalAlgorithmType === "KNAPSACK") {
		return assignCaregiversWithKnapsack(shifts, caregivers, weights);
	}

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
				globalAlgorithmType: z.nativeEnum(GlobalAlgorithmType),
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

			const baseCaregivers = caregiversWithLocation.map((cg) => {
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

			const shiftsFromDb = await ctx.db
				.select({
					id: shifts.id,
					patientId: shifts.patientId,
					startsAt: shifts.startsAt,
					endsAt: shifts.endsAt,
					caregiverId: shifts.caregiverId,
					patientName: patients.name,
					patientLocationWKT: sql<string>`ST_AsText(${patients.location})`,
				})
				.from(shifts)
				.leftJoin(patients, eq(shifts.patientId, patients.id));

			const computedShifts = shiftsFromDb.map((shift) => ({
				id: shift.id,
				patientId: shift.patientId,
				startsAt: new Date(shift.startsAt),
				endsAt: new Date(shift.endsAt),
				caregiverId: shift.caregiverId,
				patientName: shift.patientName ?? "Unknown Patient",
				location: parseLocation(shift.patientLocationWKT),
				assignedCaregiver: null,
				isNightShift: isNightShift(shift.startsAt, shift.endsAt),
				isWeekendShift: isWeekendShift(shift.startsAt, shift.endsAt),
				needs: [1, 2, 3],
			}));

			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			if (input.globalAlgorithmType === "KNAPSACK") {
				return assignCaregiversWithKnapsack(
					computedShifts,
					baseCaregivers,
					weights,
				);
			}

			return assignCaregiversToShifts(
				MOCK_SHIFTS,
				baseCaregivers,
				weights,
				input.algorithmType,
				input.globalAlgorithmType,
			);
		}),
});
