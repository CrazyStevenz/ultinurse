import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { patients, shifts } from "../../db/schema.ts";

export const shiftRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				patientId: z.number(),
				startsAt: z.date(),
				endsAt: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(shifts).values({
				patientId: input.patientId,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
			});
		}),

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
	if (
		startAt.getHours() > endAt.getHours() ||
		(startAt.getHours() === endAt.getHours() &&
			startAt.getMinutes() > endAt.getMinutes())
	) {
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
