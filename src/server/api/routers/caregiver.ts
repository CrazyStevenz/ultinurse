import { createTRPCRouter, protectedProcedure } from "../trpc.ts";
import { caregivers } from "../../db/schema.ts";

export const caregiverRouter = createTRPCRouter({
	read: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.select().from(caregivers);
	}),
});
