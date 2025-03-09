import type { Metadata } from "next";

import ShiftsTableData from "@/app/(auth)/shifts/shift-table-data";
import { api, HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
	title: "Shifts - OptiNurse",
};

export default async function Shifts() {
	void api.shift.read.prefetch();

	return (
		<HydrateClient>
			<div className="flex flex-col items-center">
				<div className="container flex flex-col overflow-x-auto rounded-xl border border-white/25">
					<table className="w-auto table-fixed text-left">
						<thead>
							<tr className="border-b border-white/20">
								<th className="w-16 p-4 py-3">ID</th>
								<th className="w-auto min-w-24 px-2">Patient</th>
								<th className="px-2 text-right">Night</th>
								<th className="w-44 min-w-44 px-2 text-right">Starts At</th>
								<th className="w-44 min-w-44 p-4 text-right">Ends At</th>
							</tr>
						</thead>
						<tbody>
							<ShiftsTableData />
						</tbody>
					</table>
				</div>
			</div>
		</HydrateClient>
	);
}
