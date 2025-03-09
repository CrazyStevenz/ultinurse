import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { patients, shifts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const shiftRouter = createTRPCRouter({
	read: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select()
			.from(shifts)
			.leftJoin(patients, eq(shifts.patientId, patients.id));
	}),
});
