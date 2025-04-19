import { HydrateClient } from "../trpc/server.ts";

export default function Home() {
	return (
		<HydrateClient>
			<div className="flex flex-col items-center justify-center">
				<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
					<h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
						Opti<span className="text-green-500">Nurse</span>
					</h1>
				</div>
			</div>
		</HydrateClient>
	);
}
