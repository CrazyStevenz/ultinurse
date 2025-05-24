const now = new Date();
const year = now.getFullYear();
const month = now.getMonth(); // 0-based
const today = now.getDate();
const lastDay = new Date(year, month + 1, 0).getDate();

export function randomShiftGenerator(count: number, patients: number[]) {
	return Array.from({ length: count }).map((_, index) => {
		const randomPatient = patients[Math.floor(Math.random() * patients.length)];

		const randomDay = today + Math.floor(Math.random() * (lastDay - today + 1));
		const startHour = 6 + Math.floor(Math.random() * 12); // 6AM to 5PM
		const startMinute = Math.floor(Math.random() * 60);

		const startsAt = new Date(year, month, randomDay, startHour, startMinute);

		const durationHours = 1 + Math.floor(Math.random() * 8); // 1–8h
		const durationMs = durationHours * 60 * 60 * 1000;
		const endsAt = new Date(startsAt.getTime() + durationMs);

		// Generate 1 to 2 skills, with an ID between 1 and 6
		const skills = Array.from(
			{ length: Math.floor(Math.random() * 2) + 1 },
			() => Math.floor(Math.random() * 6) + 1,
		);

		return {
			id: index,
			patientId: randomPatient!,
			startsAt,
			endsAt,
			skills,
		};
	});
}
