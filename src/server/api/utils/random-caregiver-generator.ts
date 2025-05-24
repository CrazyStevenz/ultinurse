export function randomCaregiverGenerator(count: number) {
	return Array.from({ length: count }).map((_, index) => {
		// Generate 2 to 4 skills, with an ID between 1 and 6
		const skills = Array.from(
			{ length: Math.floor(Math.random() * 3) + 2 },
			() => Math.floor(Math.random() * 6) + 1,
		);

		return {
			id: index,
			name: "",
			skills,
			prefersNights: Math.random() < 8 / 24,
			prefersWeekends: Math.random() < 2 / 7,
			location: [40.6 + Math.random() / 10, 22.9 + Math.random() / 10] as [
				number,
				number,
			],
		};
	});
}
