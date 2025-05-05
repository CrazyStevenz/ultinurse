const EARTH_RADIUS_IN_KM = 6371;

/**
 * Calculates the Haversine distance between two points on the Earth's surface.
 * The Haversine formula is used to calculate the distance between two points on
 * a sphere given their longitudes and latitudes.
 */
export function calculateHaversineDistance(
	point1: [number, number],
	point2: [number, number],
): number {
	// Convert latitude difference from degrees to radians
	const latDiffInRadians = (point2[0] - point1[0]) * (Math.PI / 180);
	// Convert longitude difference from degrees to radians
	const lonDiffInRadians = (point2[1] - point1[1]) * (Math.PI / 180);
	// Convert latitude of the first point from degrees to radians
	const lat1InRadians = point1[0] * (Math.PI / 180);
	// Convert latitude of the second point from degrees to radians
	const lat2InRadians = point2[0] * (Math.PI / 180);

	// Haversine formula calculation
	// 'a' is the square of half the chord length between the points
	const a =
		Math.sin(latDiffInRadians / 2) * Math.sin(latDiffInRadians / 2) +
		Math.sin(lonDiffInRadians / 2) *
			Math.sin(lonDiffInRadians / 2) *
			Math.cos(lat1InRadians) *
			Math.cos(lat2InRadians);
	// 'c' is the angular distance in radians
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	// Calculate the distance in kilometers
	const distanceInKm = EARTH_RADIUS_IN_KM * c;

	// Round to one decimal place
	return Number(distanceInKm.toFixed(1));
}
