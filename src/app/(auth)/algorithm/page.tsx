import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "../../../server/auth";
import Loading from "../loading";
import { Algorithm } from "./algorithm";

async function AlgorithmContent() {
	const session = await auth();
	if (!session) redirect("/");

	return <Algorithm />;
}

export default function AlgorithmPage() {
	return (
		<Suspense fallback={<Loading />}>
			<AlgorithmContent />
		</Suspense>
	);
}
