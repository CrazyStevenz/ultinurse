import { Suspense } from "react";
import type { Metadata } from "next";

import ShiftsTableData from "./shift-table-data.tsx";
import { CreateShift } from "./create-shift.tsx";
import Loading from "../loading";
import { auth } from "../../../server/auth";
import { redirect } from "next/navigation";
import { BulkAssignCaregiver } from "./bulk-assign-panel";
import { UnassignAllShifts } from "./unassign-all-shifts";

export const metadata: Metadata = {
	title: "Shifts - UltiNurse",
};

async function ShiftsContent() {
	const session = await auth();
	if (!session) redirect("/");

	return (
		<>
			<div className="flex flex-col justify-between py-4 sm:flex-row">
				<span className="text-3xl font-semibold">Shifts</span>
				<div className="mt-2 space-x-2 sm:mt-0 sm:flex-row">
					<UnassignAllShifts />
					<BulkAssignCaregiver />
					<CreateShift />
				</div>
			</div>
			<div className="flex flex-col overflow-x-auto rounded-xl border border-white/25">
				<table className="w-auto table-fixed text-left">
					<thead>
						<tr className="border-b border-white/20 p-8">
							<th className="w-16 py-3 pl-4 pr-6">ID</th>
							<th className="w-full min-w-24 px-2">Patient</th>
							<th className="min-w-48 px-2 text-right">
								<div className="flex h-14 items-center justify-center px-2">
									Caregiver
								</div>
							</th>
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
		</>
	);
}

export default function ShiftsPage() {
	return (
		<Suspense fallback={<Loading />}>
			<ShiftsContent />
		</Suspense>
	);
}
