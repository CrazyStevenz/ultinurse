"use client";

import { api } from "@/trpc/react";
import { Suspense } from "react";

export default function Patients() {
  const [readPatients] = api.patient.read.useSuspenseQuery();

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-black to-green-900 text-white">
      <div className="container flex flex-col rounded-xl border border-white/25">
        <table className="w-auto table-fixed text-left">
          <thead>
            <tr className="border-b border-white/20">
              <th className="p-4 py-3">ID</th>
              <th>Name</th>
              <th className="p-4 text-right">Registered on</th>
            </tr>
          </thead>
          <tbody>
            <Suspense fallback={<span>Loading...</span>}>
              {readPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-white/15 last:border-b-0"
                >
                  <td className="p-4">{patient.id}</td>
                  <td>{patient.name}</td>
                  <td className="pr-4 text-right">
                    {patient.createdAt.toDateString()}
                  </td>
                </tr>
              ))}
            </Suspense>
          </tbody>
        </table>
      </div>
    </main>
  );
}
