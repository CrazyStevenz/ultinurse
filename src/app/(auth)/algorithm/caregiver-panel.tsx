"use client";

import { api } from "../../../trpc/react.tsx";
import type { AlgorithmType } from "../../../server/api/routers/algorithm";

export default function CaregiverPanel({
	nightWeight,
	weekendWeight,
	distanceWeight,
	algorithmType,
	showMeetsAllNeeds,
	showPartiallyMeetsNeeds,
	showOutOfBounds,
	setCaregiverId,
}: {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
	algorithmType: AlgorithmType;
	showMeetsAllNeeds: boolean;
	showPartiallyMeetsNeeds: boolean;
	showOutOfBounds: boolean;
	setCaregiverId?: (v: number) => void;
}) {
	// Fetch nurses data using the API
	const {
		data: caregiverData,
		isLoading,
		error,
		refetch,
		isRefetching,
	} = api.algorithm.read.useQuery({
		nightWeight,
		weekendWeight,
		distanceWeight,
		algorithmType,
	});

	if (isLoading || isRefetching) {
		return (
			<>
				<button
					// @ts-expect-error Doesn't work if not passed directly
					onClick={refetch}
				>
					Force refresh
				</button>
				<Skeleton />
			</>
		);
	}

	if (error) {
		return <p>Error loading caregivers: {error.message}</p>;
	}

	// Apply filtering
	const filteredCaregivers =
		caregiverData?.filter((caregiver) => {
			if (caregiver.outOfBounds && !showOutOfBounds) return false;
			if (
				caregiver.meetsAllNeeds &&
				!caregiver.outOfBounds &&
				!showMeetsAllNeeds
			)
				return false;
			if (
				!caregiver.meetsAllNeeds &&
				!caregiver.outOfBounds &&
				!showPartiallyMeetsNeeds
			)
				return false;
			return true;
		}) ?? [];

	return (
		<>
			<button
				// @ts-expect-error Doesn't work if not passed directly
				onClick={refetch}
			>
				Force refresh
			</button>
			<ul>
				{filteredCaregivers.map((caregiver, index) => (
					<li
						key={caregiver.name}
						className={`flex cursor-pointer flex-col py-4 first:rounded-t-sm last:rounded-b-sm ${
							caregiver.outOfBounds
								? "bg-gray-700 text-gray-400"
								: caregiver.percentage > 90
									? "bg-green-200 text-black hover:bg-green-300"
									: "bg-yellow-100 text-black hover:bg-yellow-200"
						}`}
						onClick={() =>
							setCaregiverId ? setCaregiverId(1) : alert(caregiver.name)
						}
					>
						<div className="flex justify-between px-4">
							<span>
								{index + 1}. {caregiver.name}
							</span>
							<span>{caregiver.percentage.toFixed(1)}%</span>
						</div>
						<div className="flex justify-between px-4">
							<span>Distance: {caregiver.distance}</span>
							<span>
								{caregiver.meetsAllNeeds
									? "Meets all needs"
									: "Partially meets needs"}
							</span>
						</div>
						<div className="flex justify-between px-4">
							<span>
								{caregiver.optimalDistance ? (
									<span className="text-green-600">✅ Optimal Distance</span>
								) : caregiver.outOfBounds ? (
									<span className="text-red-600">❌ Out of Bounds</span>
								) : (
									<span className="text-yellow-500">
										⚠️ Acceptable Distance
									</span>
								)}
							</span>
							<div className="flex">
								<span className="mr-2">
									{caregiver.nightShiftEligible ? (
										<span className="text-green-600">✅ Night Shift</span>
									) : (
										<span className="text-red-600">❌ Night Shift</span>
									)}
								</span>
								<span>
									{caregiver.weekendShiftEligible ? (
										<span className="text-green-600">✅ Weekend Shift</span>
									) : (
										<span className="text-red-600">❌ Weekend Shift</span>
									)}
								</span>
							</div>
						</div>
					</li>
				))}
			</ul>
		</>
	);
}

function Skeleton() {
	return (
		<ul>
			{Array.from({ length: 5 }).map((_, i) => (
				<li
					key={i}
					className="flex h-[6.5rem] flex-col bg-[#303030] py-4 first:rounded-t-sm last:rounded-b-sm"
				>
					<div className="flex justify-between px-4 pb-4 pt-2">
						<span className="animate-pulse">
							<div className="h-2 w-56 rounded bg-gray-200"></div>
						</span>
						<span className="animate-pulse">
							<div className="h-2 w-12 rounded bg-gray-200"></div>
						</span>
					</div>
					<div className="flex justify-between px-4 pb-4">
						<span className="animate-pulse">
							<div className="h-2 w-24 rounded bg-gray-200"></div>
						</span>
						<span className="animate-pulse">
							<div className="h-2 w-28 rounded bg-gray-200"></div>
						</span>
					</div>
					<div className="flex justify-between px-4">
						<span className="animate-pulse">
							<div className="h-2 w-40 rounded bg-gray-200"></div>
						</span>
						<div className="flex">
							<span className="mr-2 animate-pulse">
								<div className="h-2 w-24 rounded bg-gray-200"></div>
							</span>
							<span className="animate-pulse">
								<div className="h-2 w-32 rounded bg-gray-200"></div>
							</span>
						</div>
					</div>
				</li>
			))}
		</ul>
	);
}
