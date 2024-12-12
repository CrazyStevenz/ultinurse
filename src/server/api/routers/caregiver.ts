import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
import { caregivers } from "@/server/db/schema";

export const caregiverRouter = createTRPCRouter({
	hello: publicProcedure
		.input(z.object({ text: z.string() }))
		.query(({ input }) => {
			return {
				greeting: `Hello ${input.text}`,
			};
		}),

	create: protectedProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(caregivers).values({
				name: input.name,
				userId: ctx.session.user.id,
			});
		}),

	read: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.select().from(caregivers);
	}),

	// TODO: Keeping this for documentation, remove eventually
	getLatest: protectedProcedure.query(async ({ ctx }) => {
		const caregiver = await ctx.db.query.caregivers.findFirst({
			orderBy: (caregivers, { desc }) => [desc(caregivers.createdAt)],
		});

		return caregiver ?? null;
	}),
});
