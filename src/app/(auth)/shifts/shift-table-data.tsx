"use client";

import { api } from "@/trpc/react";

export default function ShiftsTableData() {
	const { data, isLoading } = api.shift.read.useQuery();

	if (isLoading || !data)
		return (
			<tr className="border-b border-white/15 last:border-b-0">
				<td className="animate-pulse p-4">
					<div className="my-2 h-2 w-4 rounded bg-gray-200"></div>
				</td>
				<td className="w-auto animate-pulse px-2">
					<div className="h-2 w-20 rounded bg-gray-200 px-4"></div>
				</td>
				<td className="animate-pulse px-2">
					<div className="float-right h-2 w-10 rounded bg-gray-200 px-4"></div>
				</td>
				<td className="animate-pulse px-2">
					<div className="float-right h-2 w-28 rounded bg-gray-200"></div>
				</td>
				<td className="animate-pulse pr-4">
					<div className="float-right h-2 w-28 rounded bg-gray-200"></div>
				</td>
			</tr>
		);

	return data.map(({ shift, patient }) => (
		<tr key={shift.id} className="border-b border-white/15 last:border-b-0">
			<td className="p-4">{shift.id}</td>
			<td className="px-2">{patient?.name}</td>
			<td className="w-8 px-2 text-center">
				{shift.isNightShift ? "✅" : "❌"}
			</td>
			<td className="px-2 text-right">
				{shift.startsAt.toISOString().replace("T", " ").slice(0, 16)}
			</td>
			<td className="pr-4 text-right">
				{shift.endsAt.toISOString().replace("T", " ").slice(0, 16)}
			</td>
		</tr>
	));
}
