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
import { Toggle } from "../../_components/ui/toggle";

const Skills = {
	1: "Skill 1",
	2: "Skill 2",
	3: "Skill 3",
	4: "Skill 4",
	5: "Skill 5",
	6: "Skill 6",
} as const;

export function CreateShift() {
	const [isOpen, setIsOpen] = useState(false);
	const [patientId, setPatientId] = useState<number | undefined>();
	const [startsAt, setStartsAt] = useState(new Date());
	const [endsAt, setEndsAt] = useState(new Date());
	const [skills, setSkills] = useState<Set<number>>(new Set());
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
						} else if (skills.size === 0) {
							setError("No skills selected.");
						} else {
							createShift.mutate({
								patientId,
								startsAt,
								endsAt,
								skills,
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
								{isLoading ? "Loading..." : "Select a patient..."}
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

					<h3 className="mb-2 justify-center text-nowrap font-semibold">
						Starts at
					</h3>
					<div className="mb-4 flex flex-nowrap">
						<DateInput
							onChange={(date) => setStartsAt(date)}
							value={startsAt}
						/>
						<span className="my-auto justify-center text-nowrap px-1 text-xl font-bold">
							-
						</span>
						<TimePickerInput
							picker="hours"
							date={startsAt}
							setDate={setStartsAt}
							className="w-14"
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

					<h3 className="mb-2 justify-center text-nowrap font-semibold">
						Ends at
					</h3>
					<div className="mb-4 flex flex-nowrap">
						<DateInput onChange={(date) => setEndsAt(date)} value={endsAt} />
						<span className="my-auto justify-center text-nowrap px-1 text-xl font-bold">
							-
						</span>
						<TimePickerInput
							picker="hours"
							date={endsAt}
							setDate={setEndsAt}
							className="w-14"
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

					<h3 className="mb-2 font-semibold">Skills:</h3>
					{Object.entries(Skills).map((entry) => {
						const skillId = parseInt(entry[0]);
						const skillName = entry[1];

						return (
							<Toggle
								key={skillId}
								className="mb-2 mr-2"
								pressed={skills.has(skillId)} // Check if skillId is in the skills array
								onPressedChange={(pressed) => {
									setError("");
									const newSkills = new Set(skills); // Create a new Set to avoid mutation
									if (pressed) newSkills.add(skillId);
									else newSkills.delete(skillId);
									setSkills(newSkills); // Update the state with the new Set
								}}
							>
								{skillName}
							</Toggle>
						);
					})}

					<DialogFooter className="mt-5 flex justify-between">
						<div className="my-2 text-red-500">{error}</div>
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
