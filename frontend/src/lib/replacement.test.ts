import { it, expect, vi } from "vitest";
import { BrowserProvider } from "ethers";
import ganache from "ganache";
const state = vi.hoisted(() => ({ provider: null as unknown }));
vi.mock("./chain", () => ({ readProvider: () => state.provider }));
import { waitReceipt } from "./transactions";
it("detects mined cancellation even when the original hash is unavailable", async () => {
  const vm = ganache.provider({
    logging: { quiet: true },
    chain: { hardfork: "london" },
  });
  const provider = new BrowserProvider(vm as never);
  provider.pollingInterval = 30;
  state.provider = provider;
  try {
    const signer = await provider.getSigner(0),
      other = await provider.getSigner(1);
    const block = await provider.getBlockNumber();
    await vm.request({ method: "miner_stop", params: [] });
    const original = await signer.sendTransaction({
      to: await other.getAddress(),
      value: 1n,
      nonce: 0,
      gasLimit: 21000,
      gasPrice: 2000000000n,
    });
    const replacement = await signer.sendTransaction({
      to: await signer.getAddress(),
      value: 0n,
      nonce: 0,
      gasLimit: 21000,
      gasPrice: 4000000000n,
    });
    await vm.request({ method: "miner_start", params: [1] });
    await replacement.wait();
    const lookup = vi.spyOn(provider, "getTransaction").mockResolvedValue(null);
    const changed = vi.fn();
    await expect(
      waitReceipt(original.hash, block, changed, original),
    ).rejects.toThrow("rejected");
    expect(changed).toHaveBeenCalledWith(replacement.hash);
    lookup.mockRestore();
  } finally {
    await vm.disconnect();
  }
}, 20000);
