import { HydrateClient } from "@/trpc/server";

export default async function Shifts() {
	return (
		<HydrateClient>
			<main className="flex min-h-screen flex-col items-center text-white">
				<div className="container flex flex-col rounded-xl border border-white/25">
					<table className="w-auto table-fixed text-left">
						<thead>
							<tr className="border-b border-white/20">
								<th className="p-4 py-3">ID</th>
								<th>Starts at</th>
								<th className="p-4 text-right">Ends at</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-white/15 last:border-b-0">
								<td className="p-4">1</td>
								<td>2024/12/29 08:00</td>
								<td className="pr-4 text-right">2024/12/29 16:00</td>
							</tr>
							<tr className="border-b border-white/15 last:border-b-0">
								<td className="p-4">2</td>
								<td>2024/12/30 08:00</td>
								<td className="pr-4 text-right">2024/12/30 16:00</td>
							</tr>
							<tr className="border-b border-white/15 last:border-b-0">
								<td className="p-4">3</td>
								<td>2024/12/31 08:00</td>
								<td className="pr-4 text-right">2024/12/31 16:00</td>
							</tr>
						</tbody>
					</table>
				</div>
			</main>
		</HydrateClient>
	);
}
