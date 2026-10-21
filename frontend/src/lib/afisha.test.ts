import { describe, it, expect } from "vitest";
import { afisha, afishaDate, filterAfisha } from "./afisha";
describe("verified city listings", () => {
  it("formats Kazakh dates without depending on browser locale support", () => {
    expect(afishaDate("2026-10-22T19:00:00+05:00", "kk")).toBe("22 қазан, 19:00");
    expect(afishaDate("2026-10-23", "ru")).toBe("23 октября");
  });
  it("combines city and category without inventing availability", () => {
    expect(
      filterAfisha(afisha, "Астана", "theatre", "").map((x) => x.id),
    ).toEqual(["shamshi"]);
    expect(
      filterAfisha(afisha, "Алматы", "theatre", "").map((x) => x.id),
    ).not.toContain("shamshi");
  });
  it("searches both languages and trims whitespace", () => {
    expect(filterAfisha(afisha, "", "", "  ҚУЫРШАҚ ").map((x) => x.id)).toEqual(
      ["detective"],
    );
    expect(filterAfisha(afisha, "", "", "мюзикл").map((x) => x.id)).toEqual([
      "shamshi",
    ]);
  });
});
