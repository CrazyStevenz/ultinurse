import { Button } from "../_components/ui/button.tsx";

export default function UIKitPage() {
	return (
		<div className="flex flex-col items-start">
			<div className="flex flex-row items-center gap-5">
				<span className="font-bold">Square Buttons:</span>
				<Button variant="default">Button</Button>
				<Button variant="destructive">Button</Button>
				<Button variant="secondary">Button</Button>
				<Button variant="ghost">Button</Button>
				<Button variant="link">Button</Button>
			</div>
			<div className="mt-5 flex flex-row items-center gap-5">
				<span className="font-bold">Rounded Buttons:</span>
				<Button variant="default" rounded>
					Button
				</Button>
				<Button variant="destructive" rounded>
					Button
				</Button>
				<Button variant="secondary" rounded>
					Button
				</Button>
				<Button variant="ghost" rounded>
					Button
				</Button>
				<Button variant="link" rounded>
					Button
				</Button>
			</div>
			<div className="mt-5 flex flex-row items-center gap-5">
				<span className="font-bold">Button size:</span>
				<Button variant="default" size="icon">
					B
				</Button>
				<Button variant="default" size="sm">
					Button
				</Button>
				<Button variant="default" size="default">
					Button
				</Button>
				<Button variant="default" size="lg">
					Button
				</Button>
			</div>
			<div className="mt-5 flex flex-row items-end gap-5">
				<span className="font-bold">Text:</span>
				<span className="text-sm">Small</span>
				<span>Medium</span>
				<span className="text-lg">Small</span>
			</div>
			<div className="mt-5 flex flex-row items-start gap-5">
				<span className="font-bold">Table:</span>
				<div className="flex flex-col rounded-xl border border-white/25">
					<table className="w-full table-fixed text-left">
						<thead>
							<tr className="border-b border-white/20">
								<th className="w-14 p-4 py-3">ID</th>
								<th>Starts at</th>
								<th>Ends at</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-white/15 last:border-b-0">
								<td className="p-4">1</td>
								<td>2024/12/29 08:00</td>
								<td>2024/12/29 16:00</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div className="mt-5 flex flex-row items-center gap-5">
				<span className="font-bold">Input field:</span>
				<input
					type="text"
					placeholder="Placeholder..."
					className="rounded-full px-4 py-2 text-black"
				/>
			</div>
		</div>
	);
}
