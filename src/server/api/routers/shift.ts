import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers, patients, shifts } from "../../db/schema.ts";
import { isWeekendShift } from "../utils/is-weekend-shift";
import { isNightShift } from "../utils/is-night-shift.ts";
import { randomShiftGenerator } from "../utils/random-shift-generator";

export const shiftRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				patientId: z.number(),
				startsAt: z.date(),
				endsAt: z.date(),
				skills: z.set(z.number()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(shifts).values({
				patientId: input.patientId,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
				skills: Array.from(input.skills),
			});
		}),

	read: protectedProcedure.query(async ({ ctx }) => {
		const results = await ctx.db
			.select()
			.from(shifts)
			.leftJoin(patients, eq(shifts.patientId, patients.id))
			.leftJoin(caregivers, eq(shifts.caregiverId, caregivers.id))
			.orderBy(shifts.id);

		return results.map((result) => {
			return {
				...result,
				shift: {
					...result.shift,
					isNightShift: isNightShift(result.shift),
					isWeekendShift: isWeekendShift(result.shift),
				},
			};
		});
	}),

	assignCaregiver: protectedProcedure
		.input(
			z.object({
				shiftId: z.number(),
				caregiverId: z.number().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(shifts)
				.set({
					caregiverId: input.caregiverId,
				})
				.where(eq(shifts.id, input.shiftId))
				.returning({ id: shifts.id });
		}),

	generateRandom: protectedProcedure.mutation(async ({ ctx }) => {
		const dbPatients = await ctx.db.select().from(patients);

		if (!dbPatients.length) {
			throw new Error("No patients available to create shifts.");
		}

		const shiftsToInsert = randomShiftGenerator(
			10,
			dbPatients.map(({ id }) => id),
		);

		await ctx.db.insert(shifts).values(shiftsToInsert);
	}),

	deleteAllAssignments: protectedProcedure.mutation(async ({ ctx }) => {
		// eslint-disable-next-line drizzle/enforce-update-with-where
		await ctx.db.update(shifts).set({ caregiverId: null });
	}),
});
