import type { Metadata } from "next";

import { CreatePatient } from "./create-patient.tsx";
import { PatientData } from "./patient-data.tsx";
import { Suspense } from "react";
import { LoadingIndicator } from "../../_components/loading-indicator";
import { auth } from "../../../server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Patients - OptiNurse",
};

async function PatientsContent() {
	const session = await auth();
	if (!session) {
		redirect("/");
	}

	return (
		<>
			<div className="flex justify-between py-4">
				<span className="text-3xl font-semibold">Patients</span>
				<CreatePatient />
			</div>
			<PatientData />
		</>
	);
}

export default function PatientsPage() {
	return (
		<Suspense fallback={<LoadingIndicator />}>
			<PatientsContent />
		</Suspense>
	);
}
