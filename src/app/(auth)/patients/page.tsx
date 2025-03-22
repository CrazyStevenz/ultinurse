import type { Metadata } from "next";

import { CreatePatient } from "@/app/(auth)/patients/create-patient";
import PatientData from "@/app/(auth)/patients/patient-data";
import { api, HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
	title: "Patients - OptiNurse",
};

export default async function Patients() {
	void api.patient.read.prefetch();

	return (
		<HydrateClient>
			<div className="flex flex-col items-center">
				<div className="container">
					<div className="flex justify-between py-4">
						<span className="text-4xl font-semibold">Patients</span>
						<CreatePatient />
					</div>
					<PatientData />
				</div>
			</div>
		</HydrateClient>
	);
}
