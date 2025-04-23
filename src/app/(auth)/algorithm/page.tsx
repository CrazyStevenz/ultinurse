import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "../../../server/auth";
import { LoadingIndicator } from "../../_components/loading-indicator";
import { Algorithm } from "./algorithm";

async function AlgorithmContent() {
	const session = await auth();
	if (!session) {
		redirect("/");
	}

	return <Algorithm />;
}

export default function AlgorithmPage() {
	return (
		<Suspense fallback={<LoadingIndicator />}>
			<AlgorithmContent />
		</Suspense>
	);
}
