import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers, patients, shifts } from "../../db/schema.ts";
import { eq, getTableColumns, sql } from "drizzle-orm";
import { isNightShift } from "../utils/is-night-shift";
import { isWeekendShift } from "../utils/is-weekend-shift";
import { calculateHaversineDistance } from "../utils/calculate-haversine-distance";
import { randomShiftGenerator } from "../utils/random-shift-generator";
import { randomCaregiverGenerator } from "../utils/random-caregiver-generator";

const SOFT_DISTANCE = 5;
const HARD_DISTANCE = 8;

const AlgorithmType = {
	MCDM: "MCDM",
	GREEDY: "GREEDY",
	RANDOM: "RANDOM",
} as const;
export type AlgorithmType = keyof typeof AlgorithmType;

const StrategyType = {
	SERIAL: "SERIAL",
	KNAPSACK: "KNAPSACK",
	TABU: "TABU",
	SIMULATED_ANNEALING: "SIMULATED_ANNEALING",
} as const;
export type StrategyType = keyof typeof StrategyType;

type Weights = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
};

type Caregiver = {
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
	skills: number[];
	patient: {
		name: string;
		location: [number, number];
	};
	assignedCaregiver?: Caregiver;
};

function normalizeScores<T extends { score: number }>(
	caregivers: T[],
): (T & { percentage: number })[] {
	const maxScore = Math.max(...caregivers.map((n) => n.score));
	return caregivers.map((caregiver) => ({
		...caregiver,
		percentage:
			caregiver.score > 0 && maxScore > 0
				? Math.round((caregiver.score / maxScore) * 1000) / 10
				: 0,
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
	shift: Shift,
	weights: Weights,
) {
	return caregivers.map((caregiver) =>
		calculateFitScoreGreedy(caregiver, shift, weights),
	);
}

function calculateFitScoreMCDM(
	caregiver: Caregiver,
	shift: Shift,
	weights: Weights,
) {
	const matchingCompetencies = shift.skills.filter((c) =>
		caregiver.skills.includes(c),
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

	const nightShiftEligible = isNightShift(shift) === caregiver.prefersNights;
	const weekendShiftEligible =
		isWeekendShift(shift) === caregiver.prefersWeekends;

	if (nightShiftEligible) score += weights.nightWeight * 5;
	if (weekendShiftEligible) score += weights.weekendWeight * 5;

	return {
		id: caregiver.id,
		name: caregiver.name,
		score,
		distance,
		meetsAllNeeds: shift.skills.every((c) => caregiver.skills.includes(c)),
		outOfBounds,
		optimalDistance,
		nightShiftEligible,
		weekendShiftEligible,
	};
}

function calculateFitScoreGreedy(
	caregiver: Caregiver,
	shift: Shift,
	weights: Weights,
) {
	const distance = calculateHaversineDistance(
		caregiver.location,
		shift.patient.location,
	);

	let score = 0;

	if (distance < SOFT_DISTANCE) {
		score += 10;
	} else if (distance <= HARD_DISTANCE) {
		score += 5;
	} else {
		score -= 10;
	}

	const nightShiftEligible = isNightShift(shift) === caregiver.prefersNights;
	const weekendShiftEligible =
		isWeekendShift(shift) === caregiver.prefersWeekends;

	if (nightShiftEligible) score += weights.nightWeight * 5;
	if (weekendShiftEligible) score += weights.weekendWeight * 5;

	return {
		id: caregiver.id,
		name: caregiver.name,
		score,
		distance,
		meetsAllNeeds: shift.skills.every((c) => caregiver.skills.includes(c)),
		outOfBounds: distance > HARD_DISTANCE,
		optimalDistance: distance < SOFT_DISTANCE,
		nightShiftEligible,
		weekendShiftEligible,
	};
}

function calculateFitScoreRandom(caregiverId: number) {
	return {
		id: caregiverId,
		name: "",
		score: 1,
		distance: 1,
		percentage: 100,
		meetsAllNeeds: false,
		outOfBounds: false,
		optimalDistance: false,
		nightShiftEligible: false,
		weekendShiftEligible: false,
	};
}

function assignCaregiversWithKnapsack(
	shifts: Shift[],
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
	unfiltered: boolean,
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
			algorithmType,
			unfiltered,
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
				algorithmType,
				unfiltered,
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
	unfiltered: boolean,
) {
	const caregiversToUse = unfiltered
		? caregivers
		: caregivers.filter((caregiver) =>
				shift.skills.some((skill) => caregiver.skills.includes(skill)),
			);

	switch (algorithmType) {
		case "MCDM":
			return normalizeScores(
				rankNursesMCDM(caregiversToUse, shift, weights),
			).sort((a, b) => b.percentage - a.percentage);
		case "GREEDY":
			return normalizeScores(
				rankNursesGreedy(caregiversToUse, shift, weights),
			).sort((a, b) => b.percentage - a.percentage);
		case "RANDOM":
			return caregivers.map((caregiver) =>
				calculateFitScoreRandom(caregiver.id),
			);
	}
}

function assignCaregiversToShifts(
	shifts: Shift[],
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
	strategyType: StrategyType,
	unfiltered: boolean,
) {
	if (strategyType === "KNAPSACK") {
		// You would need to modify assignCaregiversWithKnapsack similarly
		const knapsackAssignments = assignCaregiversWithKnapsack(
			shifts,
			caregivers,
			weights,
			algorithmType,
			unfiltered,
		);

		return knapsackAssignments.map((shift) => ({
			shift,
			caregiver: shift.assignedCaregiver,
		}));
	}

	if (strategyType === "TABU") {
		const tabuAssignments = assignCaregiversWithTABUSearch(
			shifts,
			caregivers,
			weights,
			algorithmType,
			unfiltered,
		);

		return tabuAssignments.map((shift) => ({
			shift,
			caregiver: shift.assignedCaregiver,
		}));
	}

	if (strategyType === "SIMULATED_ANNEALING") {
		const simulatedAnnealingAssignments =
			assignCaregiversWithSimulatedAnnealing(
				shifts,
				caregivers,
				weights,
				algorithmType,
				unfiltered,
			);

		return simulatedAnnealingAssignments.map((shift) => ({
			shift,
			caregiver: shift.assignedCaregiver,
		}));
	}

	const assignedCaregivers = new Set<number>();

	return shifts.map((shift) => {
		const availableCaregivers = caregivers.filter(
			(caregiver) => !assignedCaregivers.has(caregiver.id),
		);

		const rankedNurses = getNursesSortedByFit(
			shift,
			availableCaregivers,
			weights,
			algorithmType,
			unfiltered,
		);

		const topRanked = rankedNurses[0];
		const bestCaregiver = topRanked
			? availableCaregivers.find((cg) => cg.id === topRanked.id)
			: undefined;

		if (bestCaregiver) {
			assignedCaregivers.add(bestCaregiver.id);
		}

		return {
			shift,
			caregiver: bestCaregiver,
		};
	});
}

// Type for a move in the TABU search
type TabuMove = {
	shiftId: number;
	caregiverId: number;
};

// Type for tracking the best move
type BestMove = {
	shiftId: number;
	oldCaregiverId: number | null;
	newCaregiverId: number;
};

function assignCaregiversWithSimulatedAnnealing(
	shifts: Shift[],
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
	unfiltered: boolean,
): Shift[] {
	if (shifts.length === 0) {
		console.warn("No shifts available to assign caregivers.");
		return [];
	}

	// Deep clone the shifts array
	const result: Shift[] = shifts.map((shift) => ({
		...shift,
		patient: { ...shift.patient },
		isNightShift: isNightShift(shift),
		isWeekendShift: isWeekendShift(shift),
	}));

	// Initialize with a greedy solution for better starting point
	const initialAssignedCaregivers = new Set<number>();
	for (const shift of result) {
		const availableCaregivers = caregivers.filter(
			(caregiver) => !initialAssignedCaregivers.has(caregiver.id),
		);

		if (availableCaregivers.length > 0) {
			// Sort caregivers by their fit score for this shift
			const rankedCaregivers = getNursesSortedByFit(
				shift,
				availableCaregivers,
				weights,
				algorithmType,
				unfiltered,
			);

			// Select the best available caregiver with some randomness
			// (80% chance to pick from top 3 if available)
			let selectedIndex = 0;
			if (rankedCaregivers.length > 1 && Math.random() < 0.8) {
				const topCount = Math.min(3, rankedCaregivers.length);
				selectedIndex = Math.floor(Math.random() * topCount);
			} else if (rankedCaregivers.length > 0) {
				selectedIndex = Math.floor(Math.random() * rankedCaregivers.length);
			}

			if (rankedCaregivers[selectedIndex]) {
				const selectedCaregiver = caregivers.find(
					(c) => c.id === rankedCaregivers[selectedIndex]!.id,
				);
				if (selectedCaregiver) {
					shift.assignedCaregiver = selectedCaregiver;
					initialAssignedCaregivers.add(selectedCaregiver.id);
				}
			}
		}
	}

	// Calculate initial solution score
	let currentSolution: Shift[] = [...result];
	let currentScore: number = calculateSolutionScore(
		currentSolution,
		weights,
		algorithmType,
		unfiltered,
	);
	let bestSolution: Shift[] = [...currentSolution];
	let bestScore: number = currentScore;

	// Simulated annealing parameters - adjusted for better performance
	const initialTemperature = 100.0;
	const coolingRate = 0.97; // Slower cooling for more thorough exploration
	const minTemperature = 0.01; // Lower minimum temperature
	const maxIterationsPerTemperature = Math.max(100, shifts.length * 2); // Scale with problem size

	// Simulated annealing process
	let temperature = initialTemperature;
	let iterationsWithoutImprovement = 0;
	const maxIterationsWithoutImprovement = maxIterationsPerTemperature * 3;

	while (
		temperature > minTemperature &&
		iterationsWithoutImprovement < maxIterationsWithoutImprovement
	) {
		let improvementFound = false;

		for (let i = 0; i < maxIterationsPerTemperature; i++) {
			// Generate a neighbor solution using one of several neighborhood moves
			const newSolution = [...currentSolution];
			const moveType = Math.random();

			if (moveType < 0.5 && newSolution.length >= 2) {
				// Move type 1: Swap assignments between two shifts (50% chance)
				const shiftIndex1 = Math.floor(Math.random() * newSolution.length);
				let shiftIndex2 = Math.floor(Math.random() * newSolution.length);
				// Ensure we select two different shifts
				while (shiftIndex2 === shiftIndex1 && newSolution.length > 1) {
					shiftIndex2 = Math.floor(Math.random() * newSolution.length);
				}

				const shift1 = newSolution[shiftIndex1]!;
				const shift2 = newSolution[shiftIndex2]!;

				// Swap the assigned caregivers
				const tempCaregiver = shift1.assignedCaregiver;
				newSolution[shiftIndex1] = {
					...shift1,
					assignedCaregiver: shift2.assignedCaregiver,
				};
				newSolution[shiftIndex2] = {
					...shift2,
					assignedCaregiver: tempCaregiver,
				};
			} else {
				// Move type 2: Reassign a shift to a different caregiver (50% chance)
				const shiftIndex = Math.floor(Math.random() * newSolution.length);
				const shift = newSolution[shiftIndex]!;

				// Get all caregivers not currently assigned to any shift in the solution
				const assignedCaregiverIds = new Set(
					newSolution
						.map((s) => s.assignedCaregiver?.id)
						.filter((id): id is number => id !== undefined),
				);

				// Filter out the current caregiver assigned to this shift
				if (shift.assignedCaregiver) {
					assignedCaregiverIds.delete(shift.assignedCaregiver.id);
				}

				const availableCaregivers = caregivers.filter(
					(caregiver) => !assignedCaregiverIds.has(caregiver.id),
				);

				if (availableCaregivers.length > 0) {
					// Select a caregiver with preference for those with better fit
					const rankedAvailableCaregivers = getNursesSortedByFit(
						shift,
						availableCaregivers,
						weights,
						algorithmType,
						unfiltered,
					);

					// Temperature-dependent selection: higher temp = more random
					const randomFactor = temperature / initialTemperature;
					let selectedIndex = 0;

					if (rankedAvailableCaregivers.length > 1) {
						if (Math.random() < randomFactor) {
							// More random selection at higher temperatures
							selectedIndex = Math.floor(
								Math.random() * rankedAvailableCaregivers.length,
							);
						} else {
							// More greedy selection at lower temperatures
							// Bias towards better caregivers but still allow some randomness
							const topCount = Math.max(
								1,
								Math.floor(rankedAvailableCaregivers.length * 0.3),
							);
							selectedIndex = Math.floor(Math.random() * topCount);
						}
					}

					if (rankedAvailableCaregivers[selectedIndex]) {
						const newCaregiver = availableCaregivers.find(
							(c) => c.id === rankedAvailableCaregivers[selectedIndex]!.id,
						);

						if (newCaregiver) {
							newSolution[shiftIndex] = {
								...shift,
								assignedCaregiver: newCaregiver,
							};
						}
					}
				}
			}

			// Calculate new solution score
			const newScore = calculateSolutionScore(
				newSolution,
				weights,
				algorithmType,
				unfiltered,
			);

			// Decide whether to accept the new solution
			const scoreDifference = newScore - currentScore;

			if (scoreDifference > 0) {
				// Accept better solution
				currentSolution = newSolution;
				currentScore = newScore;
				improvementFound = true;

				// Update best solution if current is better
				if (currentScore > bestScore) {
					bestSolution = [...currentSolution];
					bestScore = currentScore;
					iterationsWithoutImprovement = 0; // Reset counter when we find a new best
				}
			} else {
				// Accept worse solution with a probability that decreases as temperature decreases
				// Using Metropolis criterion for acceptance probability
				const acceptanceProbability = Math.exp(scoreDifference / temperature);
				if (Math.random() < acceptanceProbability) {
					currentSolution = newSolution;
					currentScore = newScore;
				}
			}
		}

		// Update iterations without improvement counter
		if (!improvementFound) {
			iterationsWithoutImprovement += maxIterationsPerTemperature;
		}

		// Cool down
		temperature *= coolingRate;
	}

	// Ensure all shifts have an assigned caregiver if possible
	const finalSolution = [...bestSolution];
	const assignedCaregiverIds = new Set(
		finalSolution
			.map((s) => s.assignedCaregiver?.id)
			.filter((id): id is number => id !== undefined),
	);

	// Try to assign caregivers to any unassigned shifts
	for (let i = 0; i < finalSolution.length; i++) {
		if (!finalSolution[i]!.assignedCaregiver) {
			const unassignedCaregivers = caregivers.filter(
				(caregiver) => !assignedCaregiverIds.has(caregiver.id),
			);

			if (unassignedCaregivers.length > 0) {
				const rankedCaregivers = getNursesSortedByFit(
					finalSolution[i]!,
					unassignedCaregivers,
					weights,
					algorithmType,
					unfiltered,
				);

				if (rankedCaregivers.length > 0) {
					const bestCaregiver = unassignedCaregivers.find(
						(c) => c.id === rankedCaregivers[0]!.id,
					);

					if (bestCaregiver) {
						finalSolution[i] = {
							...finalSolution[i]!,
							assignedCaregiver: bestCaregiver,
						};
						assignedCaregiverIds.add(bestCaregiver.id);
					}
				}
			}
		}
	}

	return finalSolution;
}

function assignCaregiversWithTABUSearch(
	shifts: Shift[],
	caregivers: Caregiver[],
	weights: Weights,
	algorithmType: AlgorithmType,
	unfiltered: boolean,
): Shift[] {
	if (shifts.length === 0) {
		console.warn("No shifts available to assign caregivers.");
		return [];
	}

	// Deep clone the shifts array
	const result: Shift[] = shifts.map((shift) => ({
		...shift,
		patient: { ...shift.patient },
		isNightShift: isNightShift(shift),
		isWeekendShift: isWeekendShift(shift),
	}));

	// Initialize with a random solution
	const assignedCaregivers = new Set<number>();
	for (const shift of result) {
		const availableCaregivers = caregivers.filter(
			(caregiver) => !assignedCaregivers.has(caregiver.id),
		);

		if (availableCaregivers.length > 0) {
			const randomIndex = Math.floor(
				Math.random() * availableCaregivers.length,
			);
			const randomCaregiver = availableCaregivers[randomIndex]!;
			shift.assignedCaregiver = randomCaregiver;
			assignedCaregivers.add(randomCaregiver.id);
		}
	}

	// Calculate initial solution score
	let currentSolution: Shift[] = [...result];
	let currentScore: number = calculateSolutionScore(
		currentSolution,
		weights,
		algorithmType,
		unfiltered,
	);
	let bestSolution: Shift[] = [...currentSolution];
	let bestScore: number = currentScore;

	// TABU search parameters
	const maxIterations = 100;
	const tabuListSize = 10;
	const tabuList: TabuMove[] = [];

	// TABU search iterations
	for (let iteration = 0; iteration < maxIterations; iteration++) {
		let bestNeighborSolution: Shift[] | null = null;
		let bestNeighborScore = -Infinity;
		let bestMove: BestMove | null = null;

		// Generate and evaluate all possible moves (swaps)
		for (let i = 0; i < currentSolution.length; i++) {
			const shift = currentSolution[i]!;
			const currentCaregiverId = shift.assignedCaregiver?.id ?? null;

			// Try assigning each caregiver to this shift
			for (const caregiver of caregivers) {
				// Skip if this is the current assignment
				if (caregiver.id === currentCaregiverId) continue;

				// Check if this move is in the tabu list
				const isTabu = tabuList.some(
					(tabu) =>
						tabu.shiftId === shift.id && tabu.caregiverId === caregiver.id,
				);

				// Skip tabu moves unless they lead to a better solution than the best found so far
				if (isTabu) continue;

				// Create a new solution with this move
				const newSolution: Shift[] = [...currentSolution];
				newSolution[i] = {
					...shift,
					assignedCaregiver: caregiver,
				};

				// Calculate the score of the new solution
				const newScore: number = calculateSolutionScore(
					newSolution,
					weights,
					algorithmType,
					unfiltered,
				);

				// Update best neighbor if this is better
				if (newScore > bestNeighborScore) {
					bestNeighborScore = newScore;
					bestNeighborSolution = newSolution;
					bestMove = {
						shiftId: shift.id,
						oldCaregiverId: currentCaregiverId,
						newCaregiverId: caregiver.id,
					};
				}
			}
		}

		// If no improving move was found, terminate
		if (!bestNeighborSolution || !bestMove) break;

		// Update current solution
		currentSolution = bestNeighborSolution;
		currentScore = bestNeighborScore;

		// Update the best solution if current is better
		if (currentScore > bestScore) {
			bestSolution = [...currentSolution];
			bestScore = currentScore;
		}

		// Add the move to the tabu list
		if (bestMove.oldCaregiverId !== null) {
			tabuList.push({
				shiftId: bestMove.shiftId,
				caregiverId: bestMove.oldCaregiverId,
			});
		}

		// Keep tabu list at maximum size
		if (tabuList.length > tabuListSize) {
			tabuList.shift();
		}
	}

	return bestSolution;
}

// Helper function to calculate the total score of a solution
function calculateSolutionScore(
	solution: Shift[],
	weights: Weights,
	algorithmType: AlgorithmType,
	unfiltered: boolean,
): number {
	let totalScore = 0;

	for (const shift of solution) {
		if (!shift.assignedCaregiver) continue;

		const caregiversWithDistance: (Caregiver & { distance: number })[] = [
			{
				...shift.assignedCaregiver,
				distance: parseFloat(
					calculateHaversineDistance(
						shift.assignedCaregiver.location,
						shift.patient.location,
					).toFixed(1),
				),
			},
		];

		const rankedNurses = getNursesSortedByFit(
			shift,
			caregiversWithDistance,
			weights,
			algorithmType,
			unfiltered,
		);

		const rankedNurse = rankedNurses[0];
		if (rankedNurse) {
			totalScore += rankedNurse.score;
		}
	}

	return totalScore;
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
				{ ...shift, patient },
				caregiversWithDistance,
				weights,
				input.algorithmType,
				false,
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
				strategyType: z.nativeEnum(StrategyType),
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
				skills: shift.skills,
				patient: {
					name: patient!.name,
					location: patient!.location,
				},
				isNightShift: isNightShift(shift),
				isWeekendShift: isWeekendShift(shift),
			}));

			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			const assignedShifts = assignCaregiversToShifts(
				computedShifts,
				caregiversFromDB,
				weights,
				input.algorithmType,
				input.strategyType,
				false,
			);

			for (const assignedShift of assignedShifts) {
				if (assignedShift.caregiver) {
					await ctx.db
						.update(shifts)
						.set({ caregiverId: assignedShift.caregiver.id })
						.where(eq(shifts.id, assignedShift.shift.id));
				}
			}
		}),

	readStats: protectedProcedure
		.input(
			z.object({
				nightWeight: z.number().min(0).max(5),
				weekendWeight: z.number().min(0).max(5),
				distanceWeight: z.number().min(0).max(5),
				algorithmType: z.nativeEnum(AlgorithmType),
				strategyType: z.nativeEnum(StrategyType),
			}),
		)
		.query(async ({ ctx, input }) => {
			const dbPatients = await ctx.db.select().from(patients);

			if (!dbPatients.length) {
				throw new Error("No patients available to create shifts.");
			}

			const randomShifts = randomShiftGenerator(
				1000,
				dbPatients.map((patient) => patient.id),
			).map((randomShift) => {
				const patient = dbPatients.find(
					({ id }) => id === randomShift.patientId,
				);
				return {
					...randomShift,
					patient: {
						name: patient!.name,
						location: patient!.location,
					},
				};
			});

			const weights = {
				nightWeight: input.nightWeight,
				weekendWeight: input.weekendWeight,
				distanceWeight: input.distanceWeight,
			};

			const time = performance.now();
			const data = assignCaregiversToShifts(
				randomShifts,
				randomCaregiverGenerator(1000),
				weights,
				input.algorithmType,
				input.strategyType,
				true,
			);
			const algorithmRuntimeInMs = performance.now() - time;

			return {
				algorithmRuntimeInMs,
				percentageOfMeetsAllNeeds:
					(data.reduce((acc, { shift, caregiver }) => {
						if (shift.skills.every((c) => caregiver?.skills.includes(c))) {
							return acc + 1;
						}
						return acc;
					}, 0) /
						data.length) *
					100,
				percentageOfMeetsSomeNeeds:
					(data.reduce((acc, { shift, caregiver }) => {
						if (shift.skills.some((c) => caregiver?.skills.includes(c))) {
							return acc + 1;
						}
						return acc;
					}, 0) /
						data.length) *
					100,
				percentageOfMatchesNight:
					(data.filter(({ shift, caregiver }) =>
						Boolean(isNightShift(shift) === caregiver?.prefersNights),
					).length /
						data.length) *
					100,
				percentageOfMatchesWeekend:
					(data.filter(({ shift, caregiver }) =>
						Boolean(isWeekendShift(shift) === caregiver?.prefersWeekends),
					).length /
						data.length) *
					100,
			};
		}),
});
