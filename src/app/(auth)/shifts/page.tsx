import type { Metadata } from "next";

import ShiftsTableData from "./shift-table-data.tsx";
import { CreateShift } from "./create-shift.tsx";
import { api, HydrateClient } from "../../../trpc/server.ts";

export const metadata: Metadata = {
	title: "Shifts - OptiNurse",
};

export default async function Shifts() {
	void api.shift.read.prefetch();

	return (
		<HydrateClient>
			<div className="flex flex-col items-center">
				<div className="container">
					<div className="flex justify-between py-4">
						<span className="text-4xl font-semibold">Shifts</span>
						<CreateShift />
					</div>
					<div className="flex flex-col overflow-x-auto rounded-xl border border-white/25">
						<table className="w-auto table-fixed text-left">
							<thead>
								<tr className="border-b border-white/20">
									<th className="w-16 p-4 py-3">ID</th>
									<th className="w-full min-w-24 px-2">Patient</th>
									<th className="px-2 text-right">Night</th>
									<th className="px-2 text-right">Weekend</th>
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
			</div>
		</HydrateClient>
	);
}
