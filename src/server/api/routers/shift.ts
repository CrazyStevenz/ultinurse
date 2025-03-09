import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { patients, shifts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const shiftRouter = createTRPCRouter({
	read: protectedProcedure.query(async ({ ctx }) => {
		const results = await ctx.db
			.select()
			.from(shifts)
			.leftJoin(patients, eq(shifts.patientId, patients.id));

		return results.map((result) => {
			return {
				...result,
				shift: {
					...result.shift,
					isNightShift: isNightShift(
						result.shift.startsAt,
						result.shift.endsAt,
					),
				},
			};
		});
	}),
});

// Naive implementation of overlapping hours in a day. Assumes that startAt and
// endAt are less than 24 hours apart.
function isNightShift(startAt: Date, endAt: Date) {
	// If endAt hour is smaller than startAt, it includes midnight, so night shift
	if (startAt.getHours() > endAt.getHours()) {
		return true;
	}

	// Since we already handled the edge case above, we can now just check if
	// either the start or end time is within our night shift timespan.
	return (
		startAt.getHours() < 7 ||
		startAt.getHours() >= 22 ||
		endAt.getHours() < 7 ||
		endAt.getHours() >= 22
	);
}
