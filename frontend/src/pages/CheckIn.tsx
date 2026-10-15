import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { useApp } from "../context/AppContext";
import { config, configured, getListings, read, errorKey } from "../lib/chain";
import {
  canCheckIn,
  parseTicketInput,
  positiveId,
  ticketStatus,
  type EventData,
  type Ticket,
} from "../lib/domain";
import { useLoad } from "../lib/useLoad";
import {
  Loading,
  Notice,
  RequireWallet,
  Setup,
  Status,
} from "../components/Common";
function Scanner({
  onScan,
  onError,
}: {
  onScan: (text: string) => void;
  onError: () => void;
}) {
  const id = useRef("scanner-" + Math.random().toString(36).slice(2));
  const scan = useRef(onScan);
  scan.current = onScan;
  useEffect(() => {
    let closed = false;
    let reader: import("html5-qrcode").Html5Qrcode | undefined;
    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (closed) return;
        reader = new Html5Qrcode(id.current);
        await reader.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (!closed) scan.current(text);
          },
          () => {},
        );
        if (closed && reader.isScanning) await reader.stop();
      } catch {
        if (!closed) onError();
      }
    }
    void start();
    return () => {
      closed = true;
      if (reader?.isScanning) void reader.stop().catch(() => {});
    };
  }, []);
  return <div id={id.current} className="scanner" />;
}
function EntryForm({ eventId }: { eventId: string }) {
  const { t, account, version, run, busy } = useApp();
  const [input, setInput] = useState(""),
    [camera, setCamera] = useState(false),
    [cameraError, setCameraError] = useState(false),
    [checked, setChecked] = useState(false);
  const [id, setId] = useState<bigint | null>(null),
    [error, setError] = useState("");
  const allowed = useLoad(
    "checker:" + account + ":" + eventId + ":" + version,
    () => read<boolean>("isChecker", [positiveId(eventId), account]),
    !!eventId,
  );
  const result = useLoad(
    "scan:" + String(id) + ":" + eventId + ":" + account + ":" + version,
    async () => {
      const ticket = await read<Ticket>("getTicket", [id]);
      if (ticket.eventId !== BigInt(eventId)) throw Error("wrongEvent");
      const event = await read<EventData>("getEvent", [ticket.eventId]);
      return { ticket, event };
    },
    id !== null,
    10000,
  );
  function inspect(text: string) {
    setCamera(false);
    setChecked(false);
    setError("");
    setId(null);
    try {
      setId(parseTicketInput(text, config.chainId, config.address));
    } catch (e) {
      setError(errorKey(e));
    }
  }
  if (allowed.loading) return <Loading />;
  if (allowed.error) return <Notice code={allowed.error} />;
  if (!allowed.data) return <Notice code="NotAuthorized" />;
  const data = result.data;
  const eligible =
    !!data &&
    !data.ticket.used &&
    !data.ticket.refunded &&
    canCheckIn(data.event);
  return (
    <div className="checkin-grid">
      <section className="scan-box">
        <ScanLine size={38} />
        <h2>{t("Проверьте билет", "Билетті тексеріңіз")}</h2>
        <p>
          {t(
            "Наведите камеру на QR или введите номер билета.",
            "Камераны QR-ға бағыттаңыз немесе билет нөмірін енгізіңіз.",
          )}
        </p>
        <button
          className="button secondary"
          disabled={camera}
          onClick={() => {
            setCameraError(false);
            setCamera(true);
          }}
        >
          <Camera size={18} />
          {t("Включить камеру", "Камераны қосу")}
        </button>
        {camera && (
          <>
            <Scanner
              onScan={(text) => {
                setInput(text);
                inspect(text);
              }}
              onError={() => {
                setCamera(false);
                setCameraError(true);
              }}
            />
            <button
              className="button secondary"
              onClick={() => setCamera(false)}
            >
              {t("Остановить камеру", "Камераны тоқтату")}
            </button>
          </>
        )}
        {cameraError && (
          <Notice>
            {t(
              "Камера недоступна. Разрешите доступ через HTTPS или введите ID ниже.",
              "Камера қолжетімсіз. HTTPS арқылы рұқсат беріңіз немесе төменде ID енгізіңіз.",
            )}
          </Notice>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inspect(input);
          }}
        >
          <label>
            {t("ID билета или QR JSON", "Билет ID-сі немесе QR JSON")}
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setId(null);
                setChecked(false);
              }}
              placeholder="1"
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {t("Проверить", "Тексеру")}
          </button>
        </form>
      </section>
      <section className="scan-result" aria-live="polite">
        {error ? (
          <Notice code={error} />
        ) : result.loading ? (
          <Loading />
        ) : result.error ? (
          <Notice code={result.error} />
        ) : data ? (
          <>
            <Status status={ticketStatus(data.ticket, data.event)} />
            <h2>{data.event.title}</h2>
            <p>
              {t("Билет", "Билет")} #{String(data.ticket.id)} ·{" "}
              {t("Место", "Орын")} {String(data.ticket.seatNumber)}
            </p>
            <p>{t("Владелец", "Иесі")}</p>
            <code className="address">{data.ticket.owner}</code>
            <Notice>
              {t(
                "QR можно скопировать. Сверьте владельца отдельно перед подтверждением входа.",
                "QR көшірілуі мүмкін. Кіруді растау алдында билет иесін бөлек тексеріңіз.",
              )}
            </Notice>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={checked}
                disabled={!eligible}
                onChange={(e) => setChecked(e.target.checked)}
              />
              {t("Я сверил владельца билета", "Билет иесін тексердім")}
            </label>
            <button
              className="button wide"
              disabled={!eligible || !checked || busy}
              onClick={async () => {
                const receipt = await run("checkIn", [data.ticket.id]);
                if (receipt) setChecked(false);
              }}
            >
              {t("Подтвердить вход", "Кіруді растау")}
            </button>
            {!canCheckIn(data.event) && !data.event.cancelled && (
              <p>
                {t(
                  "Вход доступен за час до начала и до окончания события.",
                  "Кіру басталуынан бір сағат бұрын ашылып, аяқталуына дейін қолжетімді.",
                )}
              </p>
            )}
          </>
        ) : (
          <>
            <h2>{t("Здесь появится результат", "Нәтиже осында көрінеді")}</h2>
            <p>
              {t(
                "Билет проверяется по актуальным данным контракта.",
                "Билет контракттың өзекті деректерімен тексеріледі.",
              )}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
export default function CheckIn() {
  const { t, account, version } = useApp();
  const [eventId, setEventId] = useState("");
  const s = useLoad(
    "check-events:" + version,
    getListings,
    configured && !!account,
  );
  if (!configured) return <Setup />;
  if (!account) return <RequireWallet />;
  return (
    <>
      <h1>{t("Проверка на входе", "Кіреберісте тексеру")}</h1>
      <p className="lead">
        {t(
          "Выберите событие, затем отсканируйте билет.",
          "Іс-шараны таңдап, билетті сканерлеңіз.",
        )}
      </p>
      {s.loading ? (
        <Loading />
      ) : s.error ? (
        <Notice code={s.error} />
      ) : (
        <label className="event-selector">
          {t("Мероприятие", "Іс-шара")}
          <select
            aria-label={t("Мероприятие", "Іс-шара")}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">
              {t("Выберите мероприятие", "Іс-шараны таңдаңыз")}
            </option>
            {s.data?.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {eventId && <EntryForm key={account + ":" + eventId} eventId={eventId} />}
    </>
  );
}
