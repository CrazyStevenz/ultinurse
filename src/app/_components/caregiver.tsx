"use client";

import { useState } from "react";

import { api } from "@/trpc/react";

export function LatestCaregiver() {
  const [latestCaregiver] = api.caregiver.getLatest.useSuspenseQuery();
  const [readCaregiver] = api.caregiver.read.useSuspenseQuery();

  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createCaregiver = api.caregiver.create.useMutation({
    onSuccess: async () => {
      await utils.caregiver.invalidate();
      setName("");
    },
  });

  return (
    <>
      <div className="w-full max-w-xs">
        {latestCaregiver ? (
          <p className="truncate">
            Your most recent caregiver: {latestCaregiver.name}
          </p>
        ) : (
          <p>You have no caregivers yet.</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCaregiver.mutate({ name });
          }}
          className="flex flex-col gap-2"
        >
          <input
            type="text"
            placeholder="Caregiver name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full px-4 py-2 text-black"
          />
          <button
            type="submit"
            className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
            disabled={createCaregiver.isPending}
          >
            {createCaregiver.isPending ? "Submitting..." : "Submit"}
          </button>
        </form>

        <div className="mt-2 flex flex-col items-center gap-1">
          {readCaregiver.map((caregiver) => (
            <p key={caregiver.id}>{caregiver.name}</p>
          ))}
        </div>
      </div>
    </>
  );
}
