export function LoadingIndicator() {
	return (
		<div className="mt-10 flex flex-col items-center">
			<span className="relative size-12">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
				<span className="relative inline-flex size-12 rounded-full bg-green-500"></span>
			</span>
		</div>
	);
}
