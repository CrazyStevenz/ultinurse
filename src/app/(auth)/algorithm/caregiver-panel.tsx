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
	assignCaregiver,
}: {
	nightWeight: number;
	weekendWeight: number;
	distanceWeight: number;
	algorithmType: AlgorithmType;
	showMeetsAllNeeds: boolean;
	showPartiallyMeetsNeeds: boolean;
	showOutOfBounds: boolean;
	assignCaregiver?: (v: number) => void;
}) {
	const {
		data: caregiverData,
		isLoading,
		error,
	} = api.algorithm.read.useQuery({
		nightWeight,
		weekendWeight,
		distanceWeight,
		algorithmType,
	});

	if (isLoading) return <Skeleton />;
	if (error) return <p>Error loading caregivers: {error.message}</p>;

	const filteredCaregivers =
		caregiverData?.filter((caregiver) => {
			const shouldShowOutOfBounds = caregiver.outOfBounds && showOutOfBounds;
			const isMeetingAllNeeds = caregiver.meetsAllNeeds && showMeetsAllNeeds;
			const isPartiallyMeetingNeeds =
				!caregiver.meetsAllNeeds && showPartiallyMeetsNeeds;

			return (
				shouldShowOutOfBounds || isMeetingAllNeeds || isPartiallyMeetingNeeds
			);
		}) ?? [];

	return (
		<ul className="md:min-w-96">
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
						assignCaregiver
							? assignCaregiver(caregiver.id)
							: alert(caregiver.name)
					}
				>
					<div className="flex justify-between px-4">
						<span>
							{index + 1}. {caregiver.name}
						</span>
						<span>{caregiver.percentage.toFixed(1)}%</span>
					</div>
					<div className="flex justify-between px-4">
						<span>Distance: {caregiver.distance} Km</span>
						<span>
							{caregiver.meetsAllNeeds
								? "Meets all needs"
								: "Partially meets needs"}
						</span>
					</div>
					<div className="flex justify-between px-4">
						<span>
							{caregiver.optimalDistance ? (
								<span className="text-green-600">✅ Distance</span>
							) : caregiver.outOfBounds ? (
								<span className="text-red-600">❌ Out of Bounds</span>
							) : (
								<span className="text-yellow-500">⚠️ Distance</span>
							)}
						</span>
						<div className="flex">
							<span className="mr-2">
								{caregiver.nightShiftEligible ? (
									<span className="text-green-600">✅ Night</span>
								) : (
									<span className="text-red-600">❌ Night</span>
								)}
							</span>
							<span>
								{caregiver.weekendShiftEligible ? (
									<span className="text-green-600">✅ Weekend</span>
								) : (
									<span className="text-red-600">❌ Weekend</span>
								)}
							</span>
						</div>
					</div>
				</li>
			))}
		</ul>
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
