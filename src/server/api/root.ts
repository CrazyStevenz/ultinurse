import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { caregiverRouter } from "@/server/api/routers/caregiver";
import { patientRouter } from "@/server/api/routers/patient";
import { shiftRouter } from "@/server/api/routers/shift";
import { algorithmRouter } from "./routers/algorithm";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	caregiver: caregiverRouter,
	patient: patientRouter,
	shift: shiftRouter,
	algorithm: algorithmRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.caregiver.all();
 *       ^? Caregiver[]
 */
export const createCaller = createCallerFactory(appRouter);
