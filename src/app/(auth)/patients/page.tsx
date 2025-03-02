"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

import { api } from "@/trpc/react";
import { CreatePatient } from "@/app/(auth)/patients/create-patient";

// Leaflet needs access to "window", so we disable SSR for it
const Map = dynamic(() => import("@/app/_components/map"), { ssr: false });

export default function Patients() {
	const [readPatients] = api.patient.read.useSuspenseQuery();

	return (
		<div className="flex flex-col items-center">
			<div className="container py-4 text-right">
				<CreatePatient />
			</div>
			<div className="container flex flex-col rounded-xl border border-white/25">
				<table className="w-auto table-fixed text-left">
					<thead>
						<tr className="border-b border-white/20">
							<th className="p-4 py-3">ID</th>
							<th>Name</th>
							<th className="p-4 text-right">Registered on</th>
						</tr>
					</thead>
					<tbody>
						<Suspense fallback={<span>Loading...</span>}>
							{readPatients.map((patient) => (
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
							))}
						</Suspense>
					</tbody>
				</table>
			</div>
			<div className="container z-0 m-4 overflow-hidden rounded-xl border">
				<Map
					entities={readPatients.map((p) => {
						return {
							text: p.name,
							location: p.location,
						};
					})}
				/>
			</div>
		</div>
	);
}
