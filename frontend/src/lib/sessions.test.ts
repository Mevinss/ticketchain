import { expect, it } from "vitest";
import { sessionSeeds, sessionsFor } from "./sessions";
import type { Listing } from "./domain";
it("links only matching on-chain metadata and respects the chosen city", () => {
  const seed = sessionSeeds.find(
    (s) => s.item.id === "qaraqshy" && s.city === "Астана",
  )!;
  const e = { id: 9n, metadataURI: seed.uri, startsAt: 100n } as Listing;
  expect(sessionsFor("qaraqshy", [e], "Астана")).toEqual([e]);
  expect(sessionsFor("qaraqshy", [e], "Алматы")).toEqual([]);
  expect(sessionsFor("kesu", [e])).toEqual([]);
  expect(
    sessionsFor("qaraqshy", [
      {
        ...e,
        metadataURI: seed.uri.replace(
          "ticketchain-ikan.onrender.com",
          "other.example",
        ),
      },
    ]),
  ).toEqual([]);
});
it("provides a unique metadata file for all seven city sessions", () => {
  expect(sessionSeeds).toHaveLength(7);
  expect(new Set(sessionSeeds.map((s) => s.uri)).size).toBe(7);
});
