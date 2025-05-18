import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers, patients, shifts } from "../../db/schema.ts";
import { eq, getTableColumns, sql } from "drizzle-orm";
import { isNightShift } from "../utils/is-night-shift";
import { isWeekendShift } from "../utils/is-weekend-shift";
import { calculateHaversineDistance } from "../utils/calculate-haversine-distance";

const SOFT_DISTANCE = 5;
const HARD_DISTANCE = 8;
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

type Weights = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
};

export type Caregiver = {
	id: number;
	name: string;
	skills: number[];
	prefersNights: boolean;
	prefersWeekends: boolean;
	location: [number, number];
};

type Shift = {
	id: number;
	patientId: number;
	startsAt: Date;
	endsAt: Date;
	needs: number[];
	patient: {
		name: string;
		location: [number, number];
	};
	assignedCaregiver?: Caregiver;
};

const MOCK_SHIFTS: Shift[] = [
	{
		id: 1,
		patientId: 1,
		startsAt: new Date("2025-04-19T08:00:00"),
		endsAt: new Date("2025-04-19T16:00:00"),
		needs: [1],
		patient: {
			name: "Mock patient 1",
			location: [40.595312, 22.946153],
		},
	},
	{
		id: 2,
		patientId: 1,
		startsAt: new Date("2025-04-20T22:00:00"),
		endsAt: new Date("2025-04-21T06:00:00"),
		needs: [2, 4],
		patient: {
			name: "Mock patient 2",
			location: [40.694887, 22.947355],
		},
	},
	{
		id: 3,
		patientId: 2,
		startsAt: new Date("2025-04-21T14:00:00"),
		endsAt: new Date("2025-04-21T22:00:00"),
		needs: [3],
		patient: {
			name: "Mock patient 3",
			location: [40.611505, 22.947786],
		},
	},
	{
		id: 4,
		patientId: 2,
		startsAt: new Date("2025-04-21T23:00:00"),
		endsAt: new Date("2025-04-22T07:00:00"),
		needs: [1, 5],
		patient: {
			name: "Mock patient 4",
			location: [40.635793, 22.94806],
		},
	},
	{
		id: 5,
		patientId: 3,
		startsAt: new Date("2025-04-18T10:00:00"),
		endsAt: new Date("2025-04-18T18:00:00"),
		needs: [2],
		patient: {
			name: "Mock patient 5",
			location: [40.550989, 22.947228],
		},
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
	patient: Shift,
	weights: Weights,
) {
	return caregivers.map((caregiver) =>
		calculateFitScoreMCDM(caregiver, patient, weights),
	);
}

function rankNursesGreedy(
	caregivers: Caregiver[],
	patient: Shift,
	weights: Weights,
): Omit<NurseData, "percentage">[] {
	return caregivers
		.filter((caregiver) =>
			caregiver.skills.some((c) => patient.needs.includes(c)),
		)
		.map((caregiver) => calculateFitScoreGreedy(caregiver, patient, weights));
}

function calculateFitScoreMCDM(
	caregiver: Caregiver,
	shift: Shift,
	weights: Weights,
) {
	const time = new Date().getTime();

	const matchingCompetencies = caregiver.skills.filter((c) =>
		shift.needs.includes(c),
	).length;
	let score = matchingCompetencies * 20;
	let optimalDistance = false;
	let outOfBounds = false;

	const distance = calculateHaversineDistance(
		caregiver.location,
		shift.patient.location,
	);
	if (distance < SOFT_DISTANCE) {
		score += 10;
		optimalDistance = true;
	} else if (distance <= HARD_DISTANCE) {
		score -= (distance - SOFT_DISTANCE) * weights.distanceWeight;
	} else {
		score -= 100;
		outOfBounds = true;
	}

	const nightShiftEligible = !caregiver.prefersNights;
	const weekendShiftEligible = !caregiver.prefersWeekends;

	if (isNightShift(shift) === nightShiftEligible) {
		score += weights.nightWeight * 5;
	}
	if (isWeekendShift(shift) === weekendShiftEligible) {
		score += weights.weekendWeight * 5;
	}

	return {
		id: caregiver.id,
		name: caregiver.name,
		score,
		distance,
		meetsAllNeeds: caregiver.skills.some((c) => shift.needs.includes(c)),
		outOfBounds,
		optimalDistance,
		nightShiftEligible,
		weekendShiftEligible,
		algorithmRuntimeInMs: new Date().getTime() - time,
	};
}

function calculateFitScoreGreedy(
	caregiver: Caregiver,
	shift: Shift,
	weights: Weights,
): Omit<NurseData, "percentage"> {
	const distance = calculateHaversineDistance(
		caregiver.location,
		shift.patient.location,
	);

	const outOfBounds = distance > HARD_DISTANCE;
	const optimalDistance = distance < SOFT_DISTANCE;
	const nightShiftEligible = caregiver.prefersNights;
	const weekendShiftEligible = caregiver.prefersWeekends;

	let score = 0;

	if (distance < SOFT_DISTANCE) {
		score += 10;
	} else if (distance <= HARD_DISTANCE) {
		score += 5;
	} else {
		score -= 10;
	}

	if (isNightShift(shift) && nightShiftEligible) {
		score += weights.nightWeight * 5;
	}
	if (isWeekendShift(shift) && weekendShiftEligible) {
		score += weights.weekendWeight * 5;
	}

	return {
		id: caregiver.id,
		name: caregiver.name,
		score,
		distance,
		meetsAllNeeds: caregiver.skills.every((c) => shift.needs.includes(c)),
		outOfBounds,
		optimalDistance,
		nightShiftEligible,
		weekendShiftEligible,
	};
}

function assignCaregiversWithKnapsack(
	shifts: Shift[],
	caregivers: Caregiver[],
	weights: Weights,
) {
	if (shifts.length === 0) {
		console.warn("No shifts available to assign caregivers.");
		return [];
	}

	const allPairs: {
		shift: Shift;
		caregiver: Caregiver;
		score: number;
	}[] = [];

	// Normalize caregivers' scores before pairing
	const normalizedCaregivers = caregivers.map((caregiver) => {
		const distance = calculateHaversineDistance(
			caregiver.location,
			shifts[0]!.patient.location,
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
				shift.patient.location,
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

	// Use Sets to keep track of unique caregivers and shifts already processed
	const assignedCaregivers = new Set<number>();
	const assignedShifts = new Set<number>();

	// Deep clone the shifts array
	const result = shifts.map((shift) => ({
		...shift,
		patient: { ...shift.patient },
		isNightShift: isNightShift(shift),
		isWeekendShift: isWeekendShift(shift),
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
	shift: Shift,
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
): NurseData[] {
	let caregiversWithNeeds: Caregiver[] = [];

	if (shift.needs.length === 1 && shift.needs[0]) {
		const singleNeed = shift.needs[0];
		caregiversWithNeeds = caregivers.filter((caregiver) =>
			caregiver.skills.includes(singleNeed),
		);
	}

	switch (algorithmType) {
		case "MCDM":
			return normalizeScores(
				rankNursesMCDM(caregiversWithNeeds, shift, weights),
			).sort((a, b) => b.percentage - a.percentage);
		case "GREEDY":
			return normalizeScores(
				rankNursesGreedy(caregiversWithNeeds, shift, weights),
			).sort((a, b) => b.percentage - a.percentage);
	}
}

function assignCaregiversToShifts(
	shifts: Shift[],
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
	globalAlgorithmType: GlobalAlgorithmType,
): { shiftId: number; caregiverId: number | null }[] {
	const assignedCaregivers = new Set<number>();

	if (globalAlgorithmType === "KNAPSACK") {
		// You would need to modify assignCaregiversWithKnapsack similarly
		const knapsackAssignments = assignCaregiversWithKnapsack(
			shifts,
			caregivers,
			weights,
		);

		return knapsackAssignments.map((shift) => ({
			shiftId: shift.id,
			caregiverId: shift.assignedCaregiver?.id ?? null,
		}));
	}

	return shifts.map((shift) => {
		const availableCaregivers = caregivers.filter(
			(caregiver) => !assignedCaregivers.has(caregiver.id),
		);

		const caregiversWithDistance = availableCaregivers.map((caregiver) => ({
			...caregiver,
			distance: parseFloat(
				calculateHaversineDistance(
					caregiver.location,
					shift.patient.location,
				).toFixed(1),
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
			? caregiversWithDistance.find((cg) => cg.name === topRanked.name)
			: undefined;

		if (bestCaregiver) {
			assignedCaregivers.add(bestCaregiver.id);
		}

		return {
			shiftId: shift.id,
			caregiverId: bestCaregiver?.id ?? null,
		};
	});
}

export const algorithmRouter = createTRPCRouter({
	read: protectedProcedure
		.input(
			z.object({
				shiftId: z.number().min(0),
				nightWeight: z.number().min(0).max(5),
				weekendWeight: z.number().min(0).max(5),
				distanceWeight: z.number().min(0).max(5),
				algorithmType: z.nativeEnum(AlgorithmType),
			}),
		)
		.query(async ({ ctx, input }) => {
			const shiftResult = await ctx.db
				.select({
					shift: getTableColumns(shifts),
					patient: {
						...getTableColumns(patients),
						locationWKT: sql<string>`ST_AsText(${patients.location})`,
					},
				})
				.from(shifts)
				.where(eq(shifts.id, input.shiftId))
				.leftJoin(patients, eq(shifts.patientId, patients.id))
				.limit(1);

			const shift = shiftResult[0]?.shift;
			if (!shift) throw new Error("Shift not found.");

			const patient = shiftResult[0]?.patient;
			if (!patient) throw new Error("Patient not found.");

			const caregiversWithDistanceRaw = await ctx.db
				.select({
					...getTableColumns(caregivers),
					locationWKT: sql<string>`ST_AsText(${caregivers.location})`,
					distance: sql<number>`ST_DistanceSphere(
						ST_GeomFromText(${patient.locationWKT}),
						${caregivers.location}
					) / 1000`,
				})
				.from(caregivers);

			const caregiversWithDistance: Caregiver[] = caregiversWithDistanceRaw.map(
				(cg) => {
					return {
						id: cg.id,
						name: cg.name,
						prefersNights: cg.prefersNights,
						prefersWeekends: cg.prefersWeekends,
						skills: cg.skills,
						location: cg.location,
						distance: parseFloat(cg.distance.toFixed(1)),
					};
				},
			);

			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			const time = performance.now() * 1000;
			const caregiverData = getNursesSortedByFit(
				{ ...shift, patient, needs: [1, 2, 3] },
				caregiversWithDistance,
				weights,
				input.algorithmType,
			);
			const algorithmRuntimeInMicroseconds = performance.now() * 1000 - time;

			return { caregivers: caregiverData, algorithmRuntimeInMicroseconds };
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
		.mutation(async ({ ctx, input }) => {
			const caregiversFromDB = await ctx.db.select().from(caregivers);

			const shiftsFromDB = await ctx.db
				.select()
				.from(shifts)
				.leftJoin(patients, eq(shifts.patientId, patients.id));

			const computedShifts = shiftsFromDB.map(({ shift, patient }) => ({
				id: shift.id,
				patientId: shift.patientId,
				startsAt: new Date(shift.startsAt),
				endsAt: new Date(shift.endsAt),
				caregiverId: shift.caregiverId,
				patient: {
					name: patient!.name,
					location: patient!.location,
				},
				isNightShift: isNightShift(shift),
				isWeekendShift: isWeekendShift(shift),
				needs: [1, 2, 3],
			}));

			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};
			const assignedShifts =
				// input.globalAlgorithmType === "KNAPSACK" ?
				assignCaregiversWithKnapsack(computedShifts, caregiversFromDB, weights);
			// : assignCaregiversToShifts(
			// 	computedShifts,
			// 	baseCaregivers,
			// 	weights,
			// 	input.algorithmType,
			// 	input.globalAlgorithmType,
			// )

			for (const assignedShift of assignedShifts) {
				await ctx.db
					.update(shifts)
					.set({ caregiverId: assignedShift.assignedCaregiver?.id })
					.where(eq(shifts.id, assignedShift.id));
			}
		}),
});
