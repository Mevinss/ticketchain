import { readProvider } from "./chain";
import { TransactionResponse, type TransactionReceipt } from "ethers";
export function submittedHash(error: unknown) {
  const hash = (error as { info?: { sendTransactionHash?: unknown } })?.info
    ?.sendTransactionHash;
  return typeof hash === "string" && /^0x[\da-f]{64}$/i.test(hash)
    ? hash
    : undefined;
}
// Observe on the configured read RPC, never the mutable wallet provider.
export async function waitReceipt(
  hash: string,
  startBlock: number,
  onReplacement: (hash: string) => void,
  original?: TransactionResponse,
  remember?: (transaction: TransactionResponse) => void,
): Promise<TransactionReceipt | null> {
  const p = readProvider();
  for (let i = 0; i < 8; i++) {
    // A node can drop the old hash after replacement. Preserve sender, nonce and
    // request fields so ethers can still scan for the mined replacement.
    const transaction = original
      ? new TransactionResponse(original, p)
      : await p.getTransaction(hash);
    if (transaction) {
      remember?.(transaction);
      try {
        return await transaction
          .replaceableTransaction(startBlock)
          .wait(1, 120000);
      } catch (e) {
        const r = e as {
          code?: string;
          cancelled?: boolean;
          receipt?: TransactionReceipt;
        };
        if (r.code === "TRANSACTION_REPLACED") {
          if (r.receipt) onReplacement(r.receipt.hash);
          if (r.cancelled) throw Error("rejected");
          return r.receipt || null;
        }
        throw e;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return p.waitForTransaction(hash, 1, 120000);
}
