export type EventData = {
  id: bigint;
  organizer: string;
  title: string;
  metadataURI: string;
  startsAt: bigint;
  endsAt: bigint;
  ticketPrice: bigint;
  capacity: bigint;
  ticketsSold: bigint;
  checkedInCount: bigint;
  refundedCount: bigint;
  salesPaused: boolean;
  cancelled: boolean;
  escrowBalance: bigint;
  proceedsWithdrawn: boolean;
};
export type Ticket = {
  id: bigint;
  eventId: bigint;
  seatNumber: bigint;
  owner: string;
  pricePaid: bigint;
  used: boolean;
  refunded: boolean;
};
export type Metadata = {
  description: string;
  descriptionKk?: string;
  venueKk?: string;
  city: string;
  venue: string;
  category: string;
  posterUrl: string;
};
export type Listing = EventData & {
  metadata: Metadata;
  metadataError?: boolean;
};
export const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000));
export function positiveId(s: string) {
  if (!/^[1-9]\d{0,76}$/.test(s) || BigInt(s) > 2n ** 256n - 1n)
    throw Error("invalidId");
  return BigInt(s);
}
export function parseTicketInput(
  input: string,
  chain: number,
  address: string,
) {
  const s = input.trim();
  if (/^\d+$/.test(s)) return positiveId(s);
  let d;
  try {
    d = JSON.parse(s);
  } catch {
    throw Error("invalidQr");
  }
  if (
    !d ||
    d.version !== 1 ||
    String(d.chainId) !== String(chain) ||
    typeof d.contractAddress !== "string" ||
    d.contractAddress.toLowerCase() !== address.toLowerCase()
  )
    throw Error("foreignQr");
  return positiveId(String(d.ticketId));
}
export function toTimestamp(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw Error("invalidDate");
  const ms = Date.parse(input + ":00+05:00");
  if (!Number.isFinite(ms) || ms < 0) throw Error("invalidDate");
  const result = BigInt(ms / 1000);
  if (toDateInput(result) !== input) throw Error("invalidDate");
  return result;
}
export function toDateInput(ts: bigint) {
  return new Date(Number(ts) * 1000 + 5 * 3600000).toISOString().slice(0, 16);
}
export const canCancel = (
  e: Pick<EventData, "startsAt" | "cancelled">,
  now = nowSeconds(),
) => !e.cancelled && now < (e.startsAt > 3600n ? e.startsAt - 3600n : 0n);
export const canCheckIn = (
  e: Pick<EventData, "startsAt" | "endsAt" | "cancelled">,
  now = nowSeconds(),
) =>
  !e.cancelled &&
  now >= (e.startsAt > 3600n ? e.startsAt - 3600n : 0n) &&
  now <= e.endsAt;
export const canBuy = (e: EventData, now = nowSeconds()) =>
  !e.cancelled &&
  !e.salesPaused &&
  now < e.startsAt &&
  e.ticketsSold < e.capacity;
export function ticketStatus(
  t: Pick<Ticket, "used" | "refunded">,
  e: Pick<EventData, "cancelled" | "endsAt">,
  now = nowSeconds(),
) {
  return t.refunded
    ? "refunded"
    : t.used
      ? "used"
      : e.cancelled
        ? "refundAvailable"
        : now > e.endsAt
          ? "ended"
          : "valid";
}
export function eventStatus(e: EventData, now = nowSeconds()) {
  return e.cancelled
    ? "cancelled"
    : now > e.endsAt
      ? "ended"
      : now >= e.startsAt
        ? "started"
        : e.salesPaused
          ? "paused"
          : e.ticketsSold >= e.capacity
            ? "soldOut"
            : "onSale";
}
export function safeUrl(value: unknown, relative = false) {
  if (typeof value !== "string") return "";
  try {
    const u = new URL(value, relative ? window.location.origin : undefined);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function normalizeMetadata(value: unknown): Metadata {
  const d =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const str = (k: string) =>
    typeof d[k] === "string" ? (d[k] as string).slice(0, 5000) : "";
  return {
    description: str("description"),
    descriptionKk: str("descriptionKk"),
    venueKk: str("venueKk"),
    city: str("city"),
    venue: str("venue"),
    category: str("category"),
    posterUrl: safeUrl(d.posterUrl),
  };
}
export const emptyMetadata: Metadata = {
  description: "",
  city: "",
  venue: "",
  category: "",
  posterUrl: "",
};
export async function loadMetadata(uri: string): Promise<Metadata> {
  const url = uri.startsWith("ipfs://")
    ? "https://ipfs.io/ipfs/" + uri.slice(7)
    : safeUrl(uri);
  if (!url) throw Error("metadataError");
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Error("metadataError");
  if (Number(r.headers.get("content-length") || 0) > 100000)
    throw Error("metadataError");
  const reader = r.body?.getReader();
  if (!reader) throw Error("metadataError");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const x = await reader.read();
    if (x.done) break;
    size += x.value.length;
    if (size > 100000) {
      await reader.cancel();
      throw Error("metadataError");
    }
    chunks.push(x.value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  const parsed = JSON.parse(new TextDecoder().decode(data));
  if (parsed && typeof parsed.posterUrl === "string") {
    try {
      parsed.posterUrl = new URL(parsed.posterUrl, url).href;
    } catch {
      parsed.posterUrl = "";
    }
  }
  return normalizeMetadata(parsed);
}
export function dateLabel(ts: bigint, lang: string) {
  if (lang === "kk") {
    const d = new Date(Number(ts) * 1000 + 5 * 3600000);
    const months = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  }
  return new Intl.DateTimeFormat(lang === "kk" ? "kk-KZ" : "ru-RU", {
    timeZone: "Asia/Qyzylorda",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(Number(ts) * 1000));
}
export const shortAddress = (s: string) =>
  s ? s.slice(0, 6) + "…" + s.slice(-4) : "";
