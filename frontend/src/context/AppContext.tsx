import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { config, errorKey, send, readProvider } from "../lib/chain";
import { submittedHash, waitReceipt } from "../lib/transactions";
import { messages } from "../lib/messages";
import type { TransactionReceipt, TransactionResponse } from "ethers";
type Tx = {
  id: number;
  name: string;
  status: "awaiting" | "pending" | "confirmed" | "failed";
  hash?: string;
  error?: string;
  startBlock?: number;
};
type AppState = {
  lang: "ru" | "kk";
  setLang: (l: "ru" | "kk") => void;
  t: (ru: string, kk: string) => string;
  msg: (key: string) => string;
  account: string;
  chain: number;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
  disconnect: () => void;
  walletError: string;
  busy: boolean;
  txs: Tx[];
  recheck: (id: number) => Promise<void>;
  run: (
    name: string,
    args: unknown[],
    value?: bigint,
  ) => Promise<TransactionReceipt | null>;
  version: number;
  refresh: () => void;
};
const Ctx = createContext<AppState>(null!);
export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<"ru" | "kk">(() =>
    localStorage.getItem("tc-lang") === "kk" ? "kk" : "ru",
  );
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState(0);
  const [walletError, setWalletError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const submitted = useRef(new Map<number, TransactionResponse>());
  const [txs, setTxs] = useState<Tx[]>([]);
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  const refresh = () => setVersion((v) => v + 1);
  const t = (ru: string, kk: string) => (lang === "kk" ? kk : ru);
  const msg = (key: string) =>
    messages[key]?.[lang === "kk" ? 1 : 0] ||
    t("Не удалось выполнить действие.", "Әрекет орындалмады.");
  function setLang(l: "ru" | "kk") {
    setLangState(l);
    localStorage.setItem("tc-lang", l);
  }
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const p = window.ethereum;
    if (!p) return;
    const changed = (a: unknown) => {
      generation.current++;
      setAccount(Array.isArray(a) ? a[0] || "" : "");
      refresh();
    };
    const chainChanged = (c: unknown) => {
      generation.current++;
      setChain(Number(c));
      refresh();
    };
    p.on?.("accountsChanged", changed);
    p.on?.("chainChanged", chainChanged);
    return () => {
      p.removeListener?.("accountsChanged", changed);
      p.removeListener?.("chainChanged", chainChanged);
    };
  }, []);
  async function connect() {
    setWalletError("");
    try {
      if (!window.ethereum) throw Error("noWallet");
      const a = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setAccount(a[0] || "");
      setChain(
        Number(await window.ethereum.request({ method: "eth_chainId" })),
      );
      generation.current++;
      refresh();
    } catch (e) {
      setWalletError(errorKey(e));
    }
  }
  async function switchChain() {
    try {
      if (!window.ethereum) throw Error("noWallet");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + config.chainId.toString(16) }],
      });
      setWalletError("");
    } catch (e) {
      setWalletError(errorKey(e));
    }
  }
  function disconnect() {
    generation.current++;
    setAccount("");
    refresh();
  }
  async function monitor(id: number, hash: string, startBlock: number) {
    const patch = (p: Partial<Tx>) =>
      setTxs((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
    try {
      const receipt = await waitReceipt(
        hash,
        startBlock,
        (replacement) => patch({ hash: replacement }),
        submitted.current.get(id),
        (tx) => submitted.current.set(id, tx),
      );
      if (!receipt) {
        patch({ status: "pending", error: "monitoringPending" });
        return null;
      }
      patch({
        status: receipt.status === 1 ? "confirmed" : "failed",
        error: receipt.status === 1 ? undefined : "transactionError",
      });
      refresh();
      return receipt.status === 1 ? receipt : null;
    } catch (e) {
      const key = errorKey(e);
      const confirmedFailure =
        key === "rejected" ||
        (e as { code?: string }).code === "CALL_EXCEPTION";
      patch({
        status: confirmedFailure ? "failed" : "pending",
        error: confirmedFailure ? key : "monitoringPending",
      });
      return null;
    }
  }
  async function recheck(id: number) {
    const tx = txs.find((x) => x.id === id);
    if (tx?.hash && !locked.current) {
      locked.current = true;
      setBusy(true);
      try {
        await monitor(id, tx.hash, tx.startBlock || 0);
      } finally {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  async function run(name: string, args: unknown[], value?: bigint) {
    if (locked.current || txs.some((x) => x.status === "pending")) return null;
    locked.current = true;
    setBusy(true);
    const id = Date.now(),
      captured = account,
      g = generation.current;
    const patch = (p: Partial<Tx>) =>
      setTxs((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setTxs((xs) =>
      [{ id, name, status: "awaiting" as const }, ...xs].slice(0, 12),
    );
    try {
      const startBlock = await readProvider().getBlockNumber();
      let hash: string;
      try {
        const response = await send(name, args, captured, value);
        submitted.current.set(id, response);
        hash = response.hash;
      } catch (e) {
        const recovered = submittedHash(e);
        if (!recovered) throw e;
        hash = recovered;
      }
      patch({ hash, startBlock, status: "pending" });
      const receipt = await monitor(id, hash, startBlock);
      return generation.current === g ? receipt : null;
    } catch (e) {
      patch({ status: "failed", error: errorKey(e) });
      return null;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Ctx.Provider
      value={{
        lang,
        setLang,
        t,
        msg,
        account,
        chain,
        connect,
        switchChain,
        disconnect,
        walletError,
        busy: busy || txs.some((x) => x.status === "pending"),
        txs,
        recheck,
        run,
        version,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
export const useApp = () => useContext(Ctx);
