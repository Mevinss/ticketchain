import { describe, it, expect } from "vitest";
import {
  parseTicketInput,
  toTimestamp,
  toDateInput,
  ticketStatus,
  normalizeMetadata,
  canCancel,
  canCheckIn,
} from "./domain";
const address = "0x0000000000000000000000000000000000000001";
describe("ticket input", () => {
  it("accepts ID and correct QR", () => {
    expect(parseTicketInput("12", 1, address)).toBe(12n);
    expect(
      parseTicketInput(
        JSON.stringify({
          version: 1,
          chainId: "1",
          contractAddress: address,
          ticketId: "2",
        }),
        1,
        address,
      ),
    ).toBe(2n);
  });
  it("rejects wrong deployment and malformed IDs", () => {
    for (const input of [
      "-1",
      "0",
      "1.5",
      "https://evil.test",
      JSON.stringify({
        version: 1,
        chainId: "2",
        contractAddress: address,
        ticketId: "2",
      }),
    ])
      expect(() => parseTicketInput(input, 1, address)).toThrow();
  });
});
describe("dates and state", () => {
  it("uses UTC+5 independent of browser timezone", () => {
    expect(toTimestamp("2026-10-20T18:30")).toBe(
      BigInt(Date.parse("2026-10-20T13:30:00Z") / 1000),
    );
    expect(toDateInput(toTimestamp("2026-10-20T18:30"))).toBe(
      "2026-10-20T18:30",
    );
  });
  it("requires real dates", () => {
    expect(() => toTimestamp("2026-02-30T10:00")).toThrow();
  });
  it("applies cancellation and entry boundary", () => {
    const e = { startsAt: 10000n, endsAt: 20000n, cancelled: false };
    expect(canCancel(e, 6399n)).toBe(true);
    expect(canCancel(e, 6400n)).toBe(false);
    expect(canCheckIn(e, 6400n)).toBe(true);
    expect(canCheckIn(e, 20001n)).toBe(false);
  });
  it("uses ticket and event state", () => {
    expect(
      ticketStatus(
        { used: false, refunded: false },
        { cancelled: true, endsAt: 20000n },
        1n,
      ),
    ).toBe("refundAvailable");
    expect(
      ticketStatus(
        { used: false, refunded: true },
        { cancelled: true, endsAt: 20000n },
        1n,
      ),
    ).toBe("refunded");
  });
});
describe("metadata", () => {
  it("rejects executable poster URL and ignores authoritative overrides", () => {
    const m = normalizeMetadata({
      description: "hello",
      posterUrl: "javascript:alert(1)",
      ticketPrice: "0",
      city: 3,
    });
    expect(m.posterUrl).toBe("");
    expect(m.city).toBe("");
    expect(m).not.toHaveProperty("ticketPrice");
  });
});
