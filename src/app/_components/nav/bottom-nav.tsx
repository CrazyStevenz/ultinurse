import { auth } from "@/server/auth";
import BottomNavLinks from "@/app/_components/nav/bottom-nav-links";

export default async function BottomNav() {
	const session = await auth();

	return (
		<div className="fixed bottom-0 left-0 z-50 block h-16 w-full bg-white shadow-[-20px_20px_10px_25px_rgba(0,0,0,0.75)] dark:bg-black">
			<div className="mx-auto grid h-full max-w-lg grid-cols-5 font-medium">
				<BottomNavLinks isLoggedIn={Boolean(session)} />
			</div>
		</div>
	);
}
