import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { patients } from "../../db/schema.ts";

export const patientRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				location: z.tuple([z.number(), z.number()]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(patients).values({
				name: input.name,
				location: input.location,
			});
		}),

	read: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.select().from(patients).orderBy(patients.id);
	}),
});
