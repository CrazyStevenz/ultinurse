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
import { DateInput } from "../../_components/ui/date-input";

export function CreateShift() {
	const [isOpen, setIsOpen] = useState(false);
	const [startsAt, setStartsAt] = useState(new Date());
	const [endsAt, setEndsAt] = useState(new Date());
	const [patientId, setPatientId] = useState<number | undefined>();
	const [error, setError] = useState("");

	const utils = api.useUtils();

	const createShift = api.shift.create.useMutation({
		onSuccess: async () => {
			await utils.shift.invalidate();
			setIsOpen(false);
		},
	});

	const generateRandomShifts = api.shift.generateRandom.useMutation({
		onSuccess: async () => {
			await utils.shift.invalidate();
			setIsOpen(false);
		},
	});

	const { data, isLoading } = api.patient.read.useQuery();

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>Create shift</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create shift</DialogTitle>
				</DialogHeader>
				<Button
					type="submit"
					variant="secondary"
					onClick={() => generateRandomShifts.mutate()}
					disabled={generateRandomShifts.isPending}
				>
					{generateRandomShifts.isPending
						? "Generating..."
						: "Generate 10 Random Shifts"}
				</Button>
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
							createShift.mutate({
								patientId,
								startsAt,
								endsAt,
							});
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
						<DateInput
							onChange={(date) => setStartsAt(date)}
							value={startsAt}
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
						<DateInput onChange={(date) => setEndsAt(date)} value={endsAt} />
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
