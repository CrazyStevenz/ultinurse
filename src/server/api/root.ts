import { createCallerFactory, createTRPCRouter } from "./trpc.ts";
import { caregiverRouter } from "./routers/caregiver.ts";
import { patientRouter } from "./routers/patient.ts";
import { shiftRouter } from "./routers/shift.ts";
import { hungarianRouter } from "./routers/hungarian.ts";
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
