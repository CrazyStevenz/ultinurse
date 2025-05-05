/**
 * Naive implementation to check if any part of a shift happens on the weekend.
 *
 * Warning: Assumes that startsAt and endsAt are less than 24 hours apart.
 */
export function isWeekendShift({
	startsAt,
	endsAt,
}: {
	startsAt: Date;
	endsAt: Date;
}): boolean {
	const startDayOfWeek = startsAt.getDay();
	const endDayOfWeek = endsAt.getDay();

	// Check if the shift starts on Saturday (6) or Sunday (0)
	const startsOnAWeekend = startDayOfWeek === 6 || startDayOfWeek === 0;

	// Check if the shift ends on Saturday (6) or Sunday (0)
	const endsOnAWeekend = endDayOfWeek === 6 || endDayOfWeek === 0;

	return startsOnAWeekend || endsOnAWeekend;
}
