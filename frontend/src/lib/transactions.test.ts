import { expect, it } from "vitest";
import { submittedHash } from "./transactions";
it("recovers a submitted hash from ethers network-change error", () => {
  const hash = "0x" + "ab".repeat(32);
  expect(
    submittedHash({
      code: "NETWORK_ERROR",
      info: { sendTransactionHash: hash },
    }),
  ).toBe(hash);
  expect(
    submittedHash({ info: { sendTransactionHash: "not-a-hash" } }),
  ).toBeUndefined();
});
