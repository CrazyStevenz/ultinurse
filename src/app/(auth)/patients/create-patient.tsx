"use client";

import { useState } from "react";
import type { LatLng } from "leaflet";
import dynamic from "next/dynamic";

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

// Leaflet needs access to "window", so we disable SSR for it
const Map = dynamic(() => import("../../../app/_components/map.tsx"), {
	ssr: false,
});

export function CreatePatient() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [position, setPosition] = useState<LatLng | null>(null);
	const [error, setError] = useState("");

	const utils = api.useUtils();

	const createPatient = api.patient.create.useMutation({
		onSuccess: async () => {
			await utils.patient.invalidate();
			setName("");
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>Create patient</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create patient</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();

						if (!name) {
							return setError("Patient name cannot be empty.");
						}

						if (!position) {
							return setError("You must select a position on the map.");
						}

						createPatient.mutate(
							{ name, location: [position.lat, position.lng] },
							{ onSuccess: () => setOpen(false) },
						);
					}}
				>
					<DialogDescription hidden>
						This dialog is used to create a new patient.
					</DialogDescription>

					<span className="my-5 flex">
						<input
							type="text"
							placeholder="Patient's name..."
							value={name}
							onChange={(e) => setName(e.target.value)}
							onClick={() => setError("")}
							className="w-full rounded-full px-4 py-2 text-black"
						/>
					</span>

					<span>
						Click to add the patient&#39;s location:
						<Map
							position={position}
							setPosition={(v) => {
								setError("");
								setPosition(v);
							}}
						/>
						{error && <span className="text-red-500">{error}</span>}
					</span>

					<DialogFooter className="mt-5">
						<Button
							type="submit"
							variant="secondary"
							disabled={createPatient.isPending}
						>
							{createPatient.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
