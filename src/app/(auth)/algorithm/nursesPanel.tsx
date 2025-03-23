"use client";

import { api } from "../../../trpc/react.tsx";

type AlgorithmType = "MCDM" | "GREEDY";

type NursesPanelProps = {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
	algorithmType: AlgorithmType;
	showMeetsAllNeeds: boolean;
	showPartiallyMeetsNeeds: boolean;
	showOutOfBounds: boolean;
};

export default function NursesPanel({
	nightWeight,
	weekendWeight,
	distanceWeight,
	algorithmType,
	showMeetsAllNeeds,
	showPartiallyMeetsNeeds,
	showOutOfBounds,
}: NursesPanelProps) {
	// Fetch nurses data using the API
	const {
		data: nursesData,
		isLoading,
		error,
	} = api.algorithm.read.useQuery({
		nightWeight,
		weekendWeight,
		distanceWeight,
		algorithmType,
	});

	if (isLoading) {
		return <p>Loading nurses...</p>;
	}

	if (error) {
		return <p>Error loading nurses: {error.message}</p>;
	}

	// Apply filtering
	const filteredNurses =
		nursesData?.filter((nurse) => {
			if (nurse.outOfBounds && !showOutOfBounds) return false;
			if (nurse.meetsAllNeeds && !nurse.outOfBounds && !showMeetsAllNeeds)
				return false;
			if (
				!nurse.meetsAllNeeds &&
				!nurse.outOfBounds &&
				!showPartiallyMeetsNeeds
			)
				return false;
			return true;
		}) ?? [];

	return (
		<div className="mb-4 flex w-full justify-center">
			<ul className="w-full md:w-1/2">
				{filteredNurses.map((nurse, index) => (
					<li
						key={nurse.name}
						className={`flex flex-col py-4 first:rounded-t-sm last:rounded-b-sm ${
							nurse.outOfBounds
								? "bg-gray-700 text-gray-400"
								: nurse.percentage > 90
									? "bg-green-200 text-black"
									: "bg-yellow-100 text-black"
						}`}
					>
						<div className="flex justify-between px-4">
							<span>
								{index + 1}. {nurse.name}
							</span>
							<span>{nurse.percentage.toFixed(1)}%</span>
						</div>
						<div className="flex justify-between px-4">
							<span>Distance: {nurse.distance}</span>
							<span>
								{nurse.meetsAllNeeds
									? "Meets all needs"
									: "Partially meets needs"}
							</span>
						</div>
						<div className="flex justify-between px-4">
							<span>
								{nurse.optimalDistance ? (
									<span className="text-green-500">✅ Optimal Distance</span>
								) : nurse.outOfBounds ? (
									<span className="text-red-500">❌ Out of Bounds</span>
								) : (
									<span className="text-yellow-500">
										⚠️ Acceptable Distance
									</span>
								)}
							</span>
							<div className="flex">
								<span className="mr-2">
									{nurse.nightShiftEligible ? (
										<span className="text-green-500">✅ Night Shift</span>
									) : (
										<span className="text-red-500">❌ Night Shift</span>
									)}
								</span>
								<span>
									{nurse.weekendShiftEligible ? (
										<span className="text-green-500">✅ Weekend Shift</span>
									) : (
										<span className="text-red-500">❌ Weekend Shift</span>
									)}
								</span>
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
