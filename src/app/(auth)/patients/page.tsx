import type { Metadata } from "next";

import { CreatePatient } from "@/app/(auth)/patients/create-patient";
import PatientData from "@/app/(auth)/patients/patient-data";

export const metadata: Metadata = {
	title: "Patients - OptiNurse",
};

export default async function Patients() {
	return (
		<div className="flex flex-col items-center">
			<div className="container">
				<div className="py-4 text-right">
					<CreatePatient />
				</div>

				<PatientData />
			</div>
		</div>
	);
}
