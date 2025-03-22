"use client";

import { useState } from "react";

import { api } from "../../../trpc/react.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../_components/ui/dialog.tsx";
import { Button } from "../../_components/ui/button.tsx";
import { TimePickerInput } from "../../_components/ui/time-picker-input.tsx";

export function CreateShift() {
	const [open, setOpen] = useState(false);
	const [startsAt, setStartsAt] = useState(new Date());
	const [endsAt, setEndsAt] = useState(new Date());
	const [patientId, setPatientId] = useState<number | undefined>();
	const [error, setError] = useState("");

	const utils = api.useUtils();

	const createShift = api.shift.create.useMutation({
		onSuccess: async () => {
			await utils.shift.invalidate();
		},
	});

	const { data, isLoading } = api.patient.read.useQuery();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>Create shift</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create shift</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						setError("");
						e.preventDefault();
						if (!patientId) {
							setError("You must select a patient.");
						} else if (startsAt >= endsAt) {
							setError("Shift must end after it starts.");
						} else if (endsAt.getTime() - startsAt.getTime() >= 86340000) {
							setError("Shift cannot be longer than 23 hours 59 minutes.");
						} else {
							createShift.mutate(
								{
									patientId,
									startsAt,
									endsAt,
								},
								{ onSuccess: () => setOpen(false) },
							);
						}
					}}
				>
					<DialogDescription hidden>
						This dialog is used to create a new shift.
					</DialogDescription>

					<div className="my-5">
						<select
							className="w-full rounded-full px-4 py-2 text-black"
							onChange={(event) =>
								setPatientId(parseInt(event.target.value) || undefined)
							}
						>
							<option key={0} value={undefined}>
								{isLoading ? "Loading..." : "Select an option..."}
							</option>
							{!isLoading &&
								data?.map((d) => {
									return (
										<option key={d.id} value={d.id}>
											{d.name}
										</option>
									);
								})}
						</select>
					</div>

					<div className="my-5 flex flex-nowrap">
						<label
							htmlFor="start"
							className="my-auto mr-4 justify-center text-nowrap font-semibold"
						>
							Starts at
						</label>
						<input
							id="start"
							type="date"
							value={`${startsAt.getFullYear()}-${(startsAt.getMonth() + 1).toString().padStart(2, "0")}-${startsAt.getDate()}`}
							onChange={(e) => setStartsAt(new Date(e.target.value))}
							className="w-auto rounded-full px-4 py-2 text-black"
						/>
						<TimePickerInput
							picker="hours"
							date={startsAt}
							setDate={setStartsAt}
							className="ml-6 w-14"
						/>
						<span className="my-auto justify-center text-nowrap px-1 text-xl font-bold">
							:
						</span>
						<TimePickerInput
							picker="minutes"
							date={startsAt}
							setDate={setStartsAt}
							className="w-14"
						/>
					</div>

					<div className="my-5 flex flex-nowrap">
						<label
							htmlFor="end"
							className="my-auto mr-4 justify-center text-nowrap font-semibold"
						>
							Ends at
						</label>
						<input
							id="end"
							type="date"
							value={`${endsAt.getFullYear()}-${(endsAt.getMonth() + 1).toString().padStart(2, "0")}-${endsAt.getDate()}`}
							onChange={(e) => setEndsAt(new Date(e.target.value))}
							className="w-auto rounded-full px-4 py-2 text-black"
						/>
						<TimePickerInput
							picker="hours"
							date={endsAt}
							setDate={setEndsAt}
							className="ml-6 w-14"
						/>
						<span className="my-auto justify-center text-nowrap px-1 text-xl font-bold">
							:
						</span>
						<TimePickerInput
							picker="minutes"
							date={endsAt}
							setDate={setEndsAt}
							className="w-14"
						/>
					</div>

					<span className="text-red-500">{error}</span>

					<DialogFooter className="mt-5">
						<Button
							type="submit"
							variant="secondary"
							disabled={createShift.isPending}
						>
							{createShift.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
