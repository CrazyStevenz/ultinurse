export function LoadingIndicator({ small }: { small?: boolean }) {
	return (
		<span className={`relative ${small ? "size-5" : "size-12"}`}>
			<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
			<span
				className={`relative inline-flex rounded-full bg-green-500 ${small ? "mb-2 size-5" : "size-12"}`}
			></span>
		</span>
	);
}
