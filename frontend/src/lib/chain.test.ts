import { it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  network: 2n,
  code: "0x1234",
  called: vi.fn(),
}));
vi.mock("ethers", async (importOriginal) => {
  const original = await importOriginal<typeof import("ethers")>();
  return {
    ...original,
    JsonRpcProvider: class {
      getNetwork() {
        return Promise.resolve({ chainId: state.network });
      }
      getCode() {
        return Promise.resolve(state.code);
      }
    },
    BrowserProvider: class {
      getCode() {
        return Promise.resolve("0x1234");
      }
      getSigner() {
        return Promise.resolve({});
      }
    },
    Contract: class {
      getFunction() {
        return Object.assign(state.called, {
          staticCall: async () => undefined,
        });
      }
    },
  };
});
it("guards a direct contract read against a wrong-network RPC", async () => {
  vi.stubEnv("VITE_CHAIN_ID", "1");
  vi.stubEnv("VITE_RPC_URL", "http://localhost:8545");
  vi.stubEnv(
    "VITE_CONTRACT_ADDRESS",
    "0x0000000000000000000000000000000000000001",
  );
  vi.resetModules();
  const { read } = await import("./chain");
  await expect(read("getEvent", [1n])).rejects.toThrow("rpcWrongNetwork");
  expect(state.called).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});
it("does not submit if network changes during preflight", async () => {
  vi.stubEnv("VITE_CHAIN_ID", "1");
  vi.stubEnv("VITE_RPC_URL", "http://localhost:8545");
  vi.stubEnv(
    "VITE_CONTRACT_ADDRESS",
    "0x0000000000000000000000000000000000000001",
  );
  vi.resetModules();
  state.called.mockClear();
  let checks = 0;
  const account = "0x0000000000000000000000000000000000000002";
  vi.stubGlobal("window", {
    ethereum: {
      request: async ({ method }: { method: string }) =>
        method === "eth_accounts" ? [account] : ++checks === 1 ? "0x1" : "0x2",
    },
  });
  const { send } = await import("./chain");
  await expect(send("buyTicket", [1n, 1n], account, 1n)).rejects.toThrow(
    "wrongNetwork",
  );
  expect(state.called).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
