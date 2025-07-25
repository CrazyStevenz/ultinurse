"use client";

import { useState } from "react";
import { api } from "../../trpc/react";
import type {
	AlgorithmType,
	StrategyType,
} from "../../server/api/routers/algorithm";
import { Toggle } from "../_components/ui/toggle";
import Loading from "../(auth)/loading";

export default function Stats() {
	const [nightWeight, setNightWeight] = useState(1);
	const [weekendWeight, setWeekendWeight] = useState(1);
	const [distanceWeight, setDistanceWeight] = useState(1);
	const [algorithmType, setAlgorithmType] = useState<AlgorithmType>("WSM");
	const [strategyType, setStrategyType] = useState<StrategyType>("SERIAL");

	return (
		<>
			<div className="mt-4">
				<h3 className="mb-2 font-semibold">Initial Algorithm:</h3>
				<div className="space-x-2">
					<Toggle
						pressed={algorithmType === "WSM"}
						onPressedChange={() => setAlgorithmType("WSM")}
					>
						WSM
					</Toggle>
					<Toggle
						pressed={algorithmType === "TOPSIS"}
						onPressedChange={() => setAlgorithmType("TOPSIS")}
					>
						TOPSIS
					</Toggle>
					<Toggle
						pressed={algorithmType === "GREEDY"}
						onPressedChange={() => setAlgorithmType("GREEDY")}
					>
						Greedy
					</Toggle>
					<Toggle
						pressed={algorithmType === "RANDOM"}
						onPressedChange={() => setAlgorithmType("RANDOM")}
					>
						Random
					</Toggle>
				</div>

				<h3 className="mb-2 mt-4 font-semibold">Executor Algorithm:</h3>
				<div className="space-x-2">
					<Toggle
						pressed={strategyType === "SERIAL"}
						onPressedChange={() => setStrategyType("SERIAL")}
					>
						Serial
					</Toggle>
					<Toggle
						pressed={strategyType === "TABU"}
						onPressedChange={() => setStrategyType("TABU")}
					>
						Tabu
					</Toggle>
					<Toggle
						pressed={strategyType === "SIMULATED_ANNEALING"}
						onPressedChange={() => setStrategyType("SIMULATED_ANNEALING")}
					>
						Simulated Annealing
					</Toggle>
				</div>

				<div className="mt-4">
					<div className="flex flex-row">
						<h3 className="mb-2 font-semibold">Night Shift Weight:</h3>
						&nbsp;{nightWeight}
					</div>
					<input
						type="range"
						min="0"
						max="5"
						value={nightWeight}
						onChange={(e) => setNightWeight(Number(e.target.value))}
						className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-800 to-green-500"
					/>
				</div>

				<div className="mt-4">
					<div className="flex flex-row">
						<h3 className="mb-2 font-semibold">Weekend Shift Weight:</h3>
						&nbsp;{weekendWeight}
					</div>
					<input
						type="range"
						min="0"
						max="5"
						value={weekendWeight}
						onChange={(e) => setWeekendWeight(Number(e.target.value))}
						className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-800 to-green-500"
					/>
				</div>

				<div className="mt-4">
					<div className="flex flex-row">
						<h3 className="mb-2 font-semibold">Distance Weight:</h3>
						&nbsp;{distanceWeight}
					</div>
					<input
						type="range"
						min="0"
						max="5"
						value={distanceWeight}
						onChange={(e) => setDistanceWeight(Number(e.target.value))}
						className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-neutral-800 to-green-500"
					/>
				</div>
			</div>
			<br />
			<br />
			<StatsPanel
				nightWeight={nightWeight}
				weekendWeight={weekendWeight}
				distanceWeight={distanceWeight}
				algorithmType={algorithmType}
				strategyType={strategyType}
			/>
		</>
	);
}

function StatsPanel({
	nightWeight,
	weekendWeight,
	distanceWeight,
	algorithmType,
	strategyType,
}: {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
	algorithmType: AlgorithmType;
	strategyType: StrategyType;
}) {
	const { data, isLoading } = api.algorithm.readStats.useQuery({
		nightWeight,
		weekendWeight,
		distanceWeight,
		algorithmType,
		strategyType,
	});

	if (isLoading || !data) return <Loading />;

	return (
		<>
			<div>Calculation took: {data.algorithmRuntimeInMs.toFixed(0)}ms</div>
			<div>All needs: {data.percentageOfMeetsAllNeeds}%</div>
			<div>Some needs: {data.percentageOfMeetsSomeNeeds}%</div>
			<div>Matches night: {data.percentageOfMatchesNight}%</div>
			<div>Matches weekend: {data.percentageOfMatchesWeekend}%</div>
			<div>Matches both: {data.percentageOfMatchesBoth}%</div>
		</>
	);
}
