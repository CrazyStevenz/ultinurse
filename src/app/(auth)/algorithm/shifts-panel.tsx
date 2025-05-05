import type { Caregiver } from "../../../server/api/routers/algorithm";

type Shift = {
	id: number;
	patientId: number;
	startsAt: Date;
	endsAt: Date;
	isNightShift: boolean;
	isWeekendShift: boolean;
	needs: number[];
	assignedCaregiver?: Caregiver;
};

export function ShiftPanel({
	shifts,
	isLoading,
	error,
	showShifts,
}: {
	shifts: Shift[] | undefined;
	isLoading: boolean;
	error: Error | null;
	showShifts: boolean;
}) {
	if (!showShifts) return null;

	return (
		<div className="mb-6 w-1/2">
			<h2 className="mb-4 text-xl font-semibold">Available Shifts</h2>
			{isLoading ? (
				<div>Loading shifts...</div>
			) : error ? (
				<div>Error loading shifts</div>
			) : (
				<ul>
					{shifts?.map((shift) => (
						<li
							key={shift.id}
							className="mb-4 rounded-md border border-gray-300 p-4"
						>
							<div>
								<strong>Shift ID:</strong> {shift.id}
							</div>
							<div>
								<strong>Patient ID:</strong> {shift.patientId}
							</div>
							<div>
								<strong>Start:</strong>{" "}
								{new Date(shift.startsAt).toLocaleString()}
							</div>
							<div>
								<strong>End:</strong> {new Date(shift.endsAt).toLocaleString()}
							</div>
							<div>
								<strong>Shift Type:</strong>{" "}
								{shift.isNightShift ? "Night Shift" : "Day Shift"}
							</div>
							<div>
								<strong>Weekend Shift:</strong>{" "}
								{shift.isWeekendShift ? "Yes" : "No"}
							</div>
							<div>
								<strong>Needed Skills:</strong> {shift.needs.join(", ")}
							</div>
							<div>
								<strong>Assigned Caregiver:</strong>{" "}
								{shift.assignedCaregiver
									? shift.assignedCaregiver.name
									: "None"}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
