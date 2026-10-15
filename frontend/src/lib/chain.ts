import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  isAddress,
  ZeroAddress,
  type Eip1193Provider,
  type ContractTransactionResponse,
} from "ethers";
import abi from "../contracts/TicketChain.abi.json";
import {
  emptyMetadata,
  loadMetadata,
  type EventData,
  type Listing,
  type Ticket,
} from "./domain";
export type WalletProvider = Eip1193Provider & {
  on?: (name: string, cb: (arg: unknown) => void) => void;
  removeListener?: (name: string, cb: (arg: unknown) => void) => void;
};
declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}
export const config = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 11155111),
  rpc: import.meta.env.VITE_RPC_URL || "",
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "",
  explorer: import.meta.env.VITE_EXPLORER_URL || "",
};
export const configured =
  !!config.rpc &&
  isAddress(config.address) &&
  config.address !== ZeroAddress &&
  Number.isSafeInteger(config.chainId) &&
  config.chainId > 0;
export const iface = new Interface(abi);
let provider: JsonRpcProvider | undefined;
export function readProvider() {
  if (!configured) throw Error("notConfigured");
  return (provider ??= new JsonRpcProvider(config.rpc, undefined, {
    batchMaxCount: 1,
  }));
}
export async function validateDeployment() {
  const p = readProvider();
  if (Number((await p.getNetwork()).chainId) !== config.chainId)
    throw Error("rpcWrongNetwork");
  if ((await p.getCode(config.address)) === "0x") throw Error("noContract");
}
let deploymentReady: Promise<void> | undefined;
export async function read<T>(name: string, args: unknown[] = []): Promise<T> {
  await (deploymentReady ??= validateDeployment().catch((e) => {
    deploymentReady = undefined;
    throw e;
  }));
  return new Contract(config.address, abi, readProvider()).getFunction(name)(
    ...args,
  ) as Promise<T>;
}
export async function listing(id: bigint): Promise<Listing> {
  const e = await read<EventData>("getEvent", [id]);
  let metadata = emptyMetadata,
    metadataError = false;
  try {
    metadata = await loadMetadata(e.metadataURI);
  } catch {
    metadataError = true;
  }
  return { ...plainEvent(e), metadata, metadataError };
}
export function plainEvent(e: EventData): EventData {
  return Object.fromEntries(
    [
      "id",
      "organizer",
      "title",
      "metadataURI",
      "startsAt",
      "endsAt",
      "ticketPrice",
      "capacity",
      "ticketsSold",
      "checkedInCount",
      "refundedCount",
      "salesPaused",
      "cancelled",
      "escrowBalance",
      "proceedsWithdrawn",
    ].map((k) => [k, e[k as keyof EventData]]),
  ) as EventData;
}
export async function getListings(): Promise<Listing[]> {
  const all: Listing[] = [];
  for (let offset = 0n; ; offset += 100n) {
    const page = await read<EventData[]>("getEvents", [offset, 100]);
    const out = await Promise.all(
      page.map(async (e) => {
        let metadata = emptyMetadata,
          metadataError = false;
        try {
          metadata = await loadMetadata(e.metadataURI);
        } catch {
          metadataError = true;
        }
        return {
          ...Object.fromEntries(
            [
              "id",
              "organizer",
              "title",
              "metadataURI",
              "startsAt",
              "endsAt",
              "ticketPrice",
              "capacity",
              "ticketsSold",
              "checkedInCount",
              "refundedCount",
              "salesPaused",
              "cancelled",
              "escrowBalance",
              "proceedsWithdrawn",
            ].map((k) => [k, e[k as keyof EventData]]),
          ),
          metadata,
          metadataError,
        } as Listing;
      }),
    );
    all.push(...out);
    if (page.length < 100) break;
  }
  return all;
}
export async function ticketsFor(address: string) {
  const all: Ticket[] = [];
  for (let offset = 0n; ; offset += 100n) {
    const ids = await read<bigint[]>("getUserTicketIds", [
      address,
      offset,
      100,
    ]);
    all.push(
      ...(await Promise.all(ids.map((id) => read<Ticket>("getTicket", [id])))),
    );
    if (ids.length < 100) break;
  }
  return all;
}
export async function send(
  name: string,
  args: unknown[],
  account: string,
  value?: bigint,
): Promise<ContractTransactionResponse> {
  if (!window.ethereum) throw Error("noWallet");
  if (!configured) throw Error("notConfigured");
  const p = new BrowserProvider(window.ethereum, config.chainId);
  const chain = Number(
    await window.ethereum.request({ method: "eth_chainId" }),
  );
  const accounts = (await window.ethereum.request({
    method: "eth_accounts",
  })) as string[];
  if (chain !== config.chainId) throw Error("wrongNetwork");
  if (accounts[0]?.toLowerCase() !== account.toLowerCase())
    throw Error("accountChanged");
  if ((await p.getCode(config.address)) === "0x") throw Error("noContract");
  const c = new Contract(config.address, abi, await p.getSigner(account));
  const fn = c.getFunction(name);
  const overrides =
    value === undefined
      ? { chainId: config.chainId }
      : { value, chainId: config.chainId };
  await fn.staticCall(...args, overrides);
  if (
    Number(await window.ethereum.request({ method: "eth_chainId" })) !==
    config.chainId
  )
    throw Error("wrongNetwork");
  const latest = (await window.ethereum.request({
    method: "eth_accounts",
  })) as string[];
  if (latest[0]?.toLowerCase() !== account.toLowerCase())
    throw Error("accountChanged");
  return fn(...args, overrides);
}
export function errorKey(e: unknown) {
  const x = e as {
    code?: string;
    data?: string;
    revert?: { name?: string };
    info?: { error?: { data?: string } };
    message?: string;
  };
  if (x.code === "ACTION_REJECTED" || (x.code as unknown) === 4001)
    return "rejected";
  if (x.code === "INSUFFICIENT_FUNDS") return "insufficientFunds";
  if (x.revert?.name) return x.revert.name;
  try {
    const d = x.data || x.info?.error?.data;
    if (typeof d === "string")
      return iface.parseError(d)?.name || "transactionError";
  } catch {
    /* unknown RPC error */
  }
  if (x.message && /^[A-Za-z]+$/.test(x.message)) return x.message;
  return "transactionError";
}
