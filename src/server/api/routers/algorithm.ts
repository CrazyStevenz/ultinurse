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
	WSM: "WSM",
	GREEDY: "GREEDY",
	RANDOM: "RANDOM",
	TOPSIS: "TOPSIS",
} as const;
export type AlgorithmType = keyof typeof AlgorithmType;

const StrategyType = {
	SERIAL: "SERIAL",
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

function rankNursesWSM(
	caregivers: Caregiver[],
	patient: Shift,
	weights: Weights,
) {
	return caregivers.map((caregiver) =>
		calculateFitScoreWSM(caregiver, patient, weights),
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

function calculateFitScoreWSM(
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

function calculatefitScoreTOPSIS(
	caregivers: Caregiver[],
	shift: Shift,
	weights: Weights,
) {
	// Step 1: Create decision matrix with criteria for each caregiver
	const decisionMatrix = caregivers.map((caregiver) => {
		// Calculate criteria values
		const matchingCompetencies =
			shift.skills.filter((c) => caregiver.skills.includes(c)).length /
			shift.skills.length; // Normalized to [0,1]

		const distance = calculateHaversineDistance(
			caregiver.location,
			shift.patient.location,
		);

		// Normalize distance to [0,1] where 1 is best (closest)
		// Values beyond HARD_DISTANCE are heavily penalized
		let normalizedDistance = 0;
		if (distance < SOFT_DISTANCE) {
			normalizedDistance = 1;
		} else if (distance <= HARD_DISTANCE) {
			normalizedDistance =
				1 - (distance - SOFT_DISTANCE) / (HARD_DISTANCE - SOFT_DISTANCE);
		}

		// Night shift preference (1 if matches, 0 if not)
		const nightShiftMatch =
			isNightShift(shift) === !caregiver.prefersNights ? 1 : 0;

		// Weekend shift preference (1 if matches, 0 if not)
		const weekendShiftMatch =
			isWeekendShift(shift) === !caregiver.prefersWeekends ? 1 : 0;

		return {
			id: caregiver.id,
			name: caregiver.name,
			criteria: {
				competencies: matchingCompetencies,
				distance: normalizedDistance,
				nightShift: nightShiftMatch,
				weekendShift: weekendShiftMatch,
			},
			// Original data for final result
			distance,
			meetsAllNeeds: shift.skills.every((c) => caregiver.skills.includes(c)),
			outOfBounds: distance > HARD_DISTANCE,
			optimalDistance: distance < SOFT_DISTANCE,
			nightShiftEligible: !caregiver.prefersNights,
			weekendShiftEligible: !caregiver.prefersWeekends,
		};
	});

	// Step 2: Normalize the decision matrix using vector normalization
	const criteriaNames = [
		"competencies",
		"distance",
		"nightShift",
		"weekendShift",
	] as const;

	// Calculate the square root of sum of squares for each criterion
	const normalizationFactors = criteriaNames.reduce(
		(factors, criterion) => {
			const sumOfSquares = decisionMatrix.reduce(
				(sum, caregiver) => sum + Math.pow(caregiver.criteria[criterion], 2),
				0,
			);
			factors[criterion] = Math.sqrt(sumOfSquares) || 1; // Avoid division by zero
			return factors;
		},
		{} as Record<(typeof criteriaNames)[number], number>,
	);

	// Normalize each value in the decision matrix
	const normalizedMatrix = decisionMatrix.map((caregiver) => {
		const normalizedCriteria = criteriaNames.reduce(
			(normalized, criterion) => {
				normalized[criterion] =
					caregiver.criteria[criterion] / normalizationFactors[criterion];
				return normalized;
			},
			{} as Record<(typeof criteriaNames)[number], number>,
		);

		return {
			...caregiver,
			normalizedCriteria,
		};
	});

	// Step 3: Apply weights to the normalized matrix
	const weightedMatrix = normalizedMatrix.map((caregiver) => {
		const weightedCriteria = {
			competencies: caregiver.normalizedCriteria.competencies, // Base weight for competencies
			distance: caregiver.normalizedCriteria.distance * weights.distanceWeight,
			nightShift: caregiver.normalizedCriteria.nightShift * weights.nightWeight,
			weekendShift:
				caregiver.normalizedCriteria.weekendShift * weights.weekendWeight,
		};

		return {
			...caregiver,
			weightedCriteria,
		};
	});

	// Step 4: Determine ideal and negative-ideal solutions
	const ideal = criteriaNames.reduce(
		(ideal, criterion) => {
			// For all criteria, higher is better in our case
			ideal[criterion] = Math.max(
				...weightedMatrix.map((c) => c.weightedCriteria[criterion]),
			);
			return ideal;
		},
		{} as Record<(typeof criteriaNames)[number], number>,
	);

	const negativeIdeal = criteriaNames.reduce(
		(negIdeal, criterion) => {
			// For all criteria, lower is worse in our case
			negIdeal[criterion] = Math.min(
				...weightedMatrix.map((c) => c.weightedCriteria[criterion]),
			);
			return negIdeal;
		},
		{} as Record<(typeof criteriaNames)[number], number>,
	);

	// Step 5: Calculate separation measures
	const separationMeasures = weightedMatrix.map((caregiver) => {
		// Distance to ideal solution (Euclidean distance)
		const distanceToIdeal = Math.sqrt(
			criteriaNames.reduce(
				(sum, criterion) =>
					sum +
					Math.pow(caregiver.weightedCriteria[criterion] - ideal[criterion], 2),
				0,
			),
		);

		// Distance to negative-ideal solution
		const distanceToNegativeIdeal = Math.sqrt(
			criteriaNames.reduce(
				(sum, criterion) =>
					sum +
					Math.pow(
						caregiver.weightedCriteria[criterion] - negativeIdeal[criterion],
						2,
					),
				0,
			),
		);

		return {
			...caregiver,
			distanceToIdeal,
			distanceToNegativeIdeal,
		};
	});

	// Step 6: Calculate relative closeness to the ideal solution
	const rankedCaregivers = separationMeasures.map((caregiver) => {
		const totalDistance =
			caregiver.distanceToIdeal + caregiver.distanceToNegativeIdeal;
		// Relative closeness (0 to 1, where 1 is closest to ideal)
		const relativeCloseness =
			totalDistance === 0
				? 0
				: caregiver.distanceToNegativeIdeal / totalDistance;

		// Scale to a score similar to the original algorithm (0-100)
		const score = relativeCloseness * 100;

		return {
			id: caregiver.id,
			name: caregiver.name,
			score,
			distance: caregiver.distance,
			meetsAllNeeds: caregiver.meetsAllNeeds,
			outOfBounds: caregiver.outOfBounds,
			optimalDistance: caregiver.optimalDistance,
			nightShiftEligible: caregiver.nightShiftEligible,
			weekendShiftEligible: caregiver.weekendShiftEligible,
		};
	});

	// Return the ranked caregivers
	return rankedCaregivers;
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
		case "WSM":
			return normalizeScores(
				rankNursesWSM(caregiversToUse, shift, weights),
			).sort((a, b) => b.percentage - a.percentage);
		case "TOPSIS":
			// TOPSIS is implemented within rankNursesWSM for multiple caregivers
			return normalizeScores(
				calculatefitScoreTOPSIS(caregiversToUse, shift, weights),
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
	if (strategyType === "TABU") {
		const tabuAssignments = assignCaregiversWithTABUSearch(
			shifts,
			caregivers,
			weights,
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
	let currentScore: number = calculateSolutionScoreUsingWSM(
		currentSolution,
		weights,
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
			const newScore = calculateSolutionScoreUsingWSM(newSolution, weights);

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
	let currentScore: number = calculateSolutionScoreUsingWSM(
		currentSolution,
		weights,
	);
	let bestSolution: Shift[] = [...currentSolution];
	let bestScore: number = currentScore;

	// TABU search parameters
	const maxIterations = 100;
	const tabuListSize = 15;
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
				const newScore: number = calculateSolutionScoreUsingWSM(
					newSolution,
					weights,
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

function calculateSolutionScoreUsingWSM(
	solution: Shift[],
	weights: Weights,
): number {
	let total = 0;
	const usedCaregivers = new Set<number>();

	for (const shift of solution) {
		const caregiver = shift.assignedCaregiver;
		if (!caregiver) continue;
		const fit = calculateFitScoreWSM(caregiver, shift, weights);
		total += fit.score;
		usedCaregivers.add(caregiver.id);
	}

	return total + usedCaregivers.size;
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
				100,
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
				randomCaregiverGenerator(100),
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
				percentageOfMatchesBoth:
					(data.filter(
						({ shift, caregiver }) =>
							Boolean(isNightShift(shift) === caregiver?.prefersNights) &&
							Boolean(isWeekendShift(shift) === caregiver?.prefersWeekends),
					).length /
						data.length) *
					100,
			};
		}),
});
