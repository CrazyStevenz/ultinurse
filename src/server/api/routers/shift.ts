import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers, patients, shifts } from "../../db/schema.ts";
import { isWeekendShift } from "../utils/is-weekend-shift";
import { isNightShift } from "../utils/is-night-shift.ts";

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
		const patientsList = await ctx.db.select().from(patients);

		if (!patientsList.length) {
			throw new Error("No patients available to create shifts.");
		}

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth(); // 0-based
		const today = now.getDate();
		const lastDay = new Date(year, month + 1, 0).getDate();

		const shiftsToInsert = Array.from({ length: 10 }).map(() => {
			const randomPatient =
				patientsList[Math.floor(Math.random() * patientsList.length)];

			const randomDay =
				today + Math.floor(Math.random() * (lastDay - today + 1));
			const startHour = 6 + Math.floor(Math.random() * 12); // 6AM to 5PM
			const startMinute = Math.floor(Math.random() * 60);

			const startsAt = new Date(year, month, randomDay, startHour, startMinute);

			const durationHours = 1 + Math.floor(Math.random() * 8); // 1–8h
			const durationMs = durationHours * 60 * 60 * 1000;
			const endsAt = new Date(startsAt.getTime() + durationMs);

			return {
				patientId: randomPatient!.id,
				startsAt,
				endsAt,
			};
		});

		await ctx.db.insert(shifts).values(shiftsToInsert);
	}),

	deleteAllAssignments: protectedProcedure.mutation(async ({ ctx }) => {
		const results = await ctx.db.select().from(shifts);

		for (const result of results) {
			await ctx.db
				.update(shifts)
				.set({
					caregiverId: null,
				})
				.where(eq(shifts.id, result.id))
				.returning({ id: shifts.id });
		}
	}),
});
