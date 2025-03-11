"use client";
import React from "react";

interface Nurse {
	name: string;
	percentage: number;
	distance: number;
	meetsAllNeeds: boolean;
	outOfBounds: boolean;
}

interface NurseListProps {
	nurses: Nurse[];
	patientName: string;
}

export default function NursesPanel({ nurses, patientName }: NurseListProps) {
	if (nurses.length === 0) {
		return (
			<p className="text-center text-red-500">
				No nurses available to meet patient {patientName}&apos;s needs within
				the selected categories.
			</p>
		);
	}

	return (
		<div className="mb-4 flex w-full justify-center">
			<ul className="w-full md:w-1/2">
				{nurses.map((nurse, index) => (
					<li
						key={nurse.name}
						className={`flex flex-col py-4 first:rounded-t-sm last:rounded-b-sm ${
							nurse.outOfBounds
								? "bg-gray-700 text-gray-400"
								: nurse.meetsAllNeeds
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
					</li>
				))}
			</ul>
		</div>
	);
}
