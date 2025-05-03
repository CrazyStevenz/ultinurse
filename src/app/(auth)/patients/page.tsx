import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreatePatient } from "./create-patient.tsx";
import { PatientData } from "./patient-data.tsx";
import Loading from "../loading";
import { auth } from "../../../server/auth";

export const metadata: Metadata = {
	title: "Patients - UltiNurse",
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
		<Suspense fallback={<Loading />}>
			<PatientsContent />
		</Suspense>
	);
}
