/**
 * Naive implementation to check if a shift is a night shift. A shift is
 * considered a night shift if any part of it occurs between 10 PM and 7 AM.
 *
 * Warning: Assumes the shift duration is less than 24 hours.
 */
export function isNightShift({
	startsAt,
	endsAt,
}: {
	startsAt: Date;
	endsAt: Date;
}) {
	const startHour = startsAt.getHours();
	const endHour = endsAt.getHours();
	const startMinute = startsAt.getMinutes();
	const endMinute = endsAt.getMinutes();

	// If the end hour is smaller than the start hour (or equal hour with smaller
	// minute), the shift crosses midnight, which is considered a night shift.
	if (
		startHour > endHour ||
		(startHour === endHour && startMinute > endMinute)
	) {
		return true;
	}

	// Since we already handled the midnight-crossing case, we can now just check
	// if either the start or end time falls within the defined night shift hours
	// (before 7 AM or at/after 10 PM).
	const isStartingAtNight = startHour < 7 || startHour >= 22;
	const isEndingAtNight = endHour < 7 || endHour >= 22;

	return isStartingAtNight || isEndingAtNight;
}
