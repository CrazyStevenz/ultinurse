import { auth } from "../../../server/auth";
import { BottomNavLinks } from "./bottom-nav-links.tsx";

export async function BottomNav() {
	const session = await auth();

	const isLoggedIn = Boolean(session);

	return (
		<div className="fixed bottom-0 left-0 z-50 block h-16 w-full bg-white shadow-[-20px_20px_10px_25px_rgba(0,0,0,0.75)] dark:bg-black">
			<div
				className={`mx-auto grid h-full max-w-lg font-medium ${isLoggedIn ? "grid-cols-4" : "grid-cols-2"}`}
			>
				<BottomNavLinks isLoggedIn={isLoggedIn} />
			</div>
		</div>
	);
}
