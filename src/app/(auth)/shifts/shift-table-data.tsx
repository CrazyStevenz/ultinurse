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
				<td className="animate-pulse">
					<div className="h-2 w-20 rounded bg-gray-200"></div>
				</td>
				<td className="animate-pulse pr-4 text-right">
					<div className="float-right h-2 w-32 rounded bg-gray-200"></div>
				</td>
			</tr>
		);

	return data.map(({ shift, patient }) => (
		<tr key={shift.id} className="border-b border-white/15 last:border-b-0">
			<td className="p-4">{shift.id}</td>
			<td>{patient?.name}</td>
			<td className="pr-4 text-right">{shift.createdAt.toDateString()}</td>
		</tr>
	));
}
