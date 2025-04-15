import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers } from "../../db/schema.ts";

export const caregiverRouter = createTRPCRouter({
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
