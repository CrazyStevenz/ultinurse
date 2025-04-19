"use client";

import dynamic from "next/dynamic";

import { api } from "../../../trpc/react.tsx";

// Leaflet needs access to "window", so we disable SSR for it
const Map = dynamic(() => import("../../../app/_components/map.tsx"), {
	ssr: false,
});

export function PatientData() {
	const { data, isLoading } = api.patient.read.useQuery();

	return (
		<>
			<div className="flex flex-col rounded-xl border border-white/25">
				<table className="w-auto table-fixed text-left">
					<thead>
						<tr className="border-b border-white/20">
							<th className="w-16 p-4 py-3">ID</th>
							<th>Name</th>
							<th className="p-4 text-right">Registered on</th>
						</tr>
					</thead>
					<tbody>
						{isLoading || !data ? (
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
						) : data.length ? (
							data.map((patient) => (
								<tr
									key={patient.id}
									className="border-b border-white/15 last:border-b-0"
								>
									<td className="p-4">{patient.id}</td>
									<td>{patient.name}</td>
									<td className="pr-4 text-right">
										{patient.createdAt.toDateString()}
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={3} className="p-4 text-center align-middle italic">
									No patients yet. When created, they will show up on the map
									below.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="mt-4 overflow-hidden rounded-xl border">
				<Map
					markers={
						isLoading || !data
							? []
							: data.map((p) => {
									return {
										text: p.name,
										location: p.location,
									};
								})
					}
				/>
			</div>
		</>
	);
}
