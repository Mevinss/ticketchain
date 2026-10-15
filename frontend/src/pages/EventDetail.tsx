import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatEther } from "ethers";
import { ArrowLeft, MapPin, CalendarDays } from "lucide-react";
import { useApp } from "../context/AppContext";
import { config, configured, iface, listing, read } from "../lib/chain";
import {
  canBuy,
  dateLabel,
  eventStatus,
  positiveId,
  type EventData,
} from "../lib/domain";
import { useLoad } from "../lib/useLoad";
import { Loading, Notice, Poster, Setup, Status } from "../components/Common";
export default function EventDetail() {
  const { eventId = "" } = useParams();
  const {
    t,
    lang,
    version,
    account,
    chain,
    connect,
    switchChain,
    run,
    busy,
    refresh,
  } = useApp();
  const [seat, setSeat] = useState<number | null>(null),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const s = useLoad(
    "event:" + eventId + ":" + version,
    async () => {
      const id = positiveId(eventId);
      const [event, seats] = await Promise.all([
        listing(id),
        read<bigint[]>("getSeatTicketIds", [id]),
      ]);
      return { event, seats };
    },
    configured,
    15000,
  );
  if (!configured) return <Setup />;
  if (s.loading) return <Loading />;
  if (s.error) return <Notice code={s.error} />;
  if (!s.data) return null;
  const { event: e, seats } = s.data;
  const available = canBuy(e);
  const selectedFree = seat !== null && seats[seat - 1] === 0n;
  async function buy() {
    setError("");
    if (seat === null) return;
    const current = await read<EventData>("getEvent", [e.id]);
    const receipt = await run("buyTicket", [e.id, seat], current.ticketPrice);
    refresh();
    if (receipt) {
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "TicketPurchased") {
            navigate("/tickets/" + parsed.args.ticketId);
            return;
          }
        } catch {
          /* other log */
        }
      }
    }
  }
  return (
    <>
      <Link className="back" to="/">
        <ArrowLeft size={16} />
        {t("Все события", "Барлық іс-шара")}
      </Link>
      <div className="event-detail">
        <Poster src={e.metadata.posterUrl} title={e.title} />
        <div>
          <Status status={eventStatus(e)} />
          <h1>{e.title}</h1>
          <p className="detail-line">
            <CalendarDays size={19} />
            {dateLabel(e.startsAt, lang)} — {dateLabel(e.endsAt, lang)} · UTC+5
          </p>
          <p className="detail-line">
            <MapPin size={19} />
            {[e.metadata.city, e.metadata.venue].filter(Boolean).join(" · ") ||
              t("Площадка уточняется", "Өтетін орны нақтылануда")}
          </p>
          <p className="description">
            {e.metadata.description ||
              t("Описание пока недоступно.", "Сипаттама әзірге қолжетімсіз.")}
          </p>
          {e.metadataError && <Notice code="metadataError" />}
          <p className="muted">
            {t(
              "Билет закрепляется за адресом покупателя. Передача не предусмотрена.",
              "Билет сатып алушының адресіне бекітіледі. Басқа адамға беру қарастырылмаған.",
            )}
          </p>
        </div>
      </div>
      <div className="booking">
        <section className="seating">
          <h2>{t("Выберите своё место", "Орныңызды таңдаңыз")}</h2>
          <div className="stage">{t("СЦЕНА / ЭКРАН", "САХНА / ЭКРАН")}</div>
          <div className="seat-grid">
            {seats.map((id, i) => (
              <button
                key={i}
                disabled={id !== 0n || !available || busy}
                className={
                  "seat " +
                  (id !== 0n ? "sold" : seat === i + 1 ? "chosen" : "")
                }
                aria-label={`${t("Место", "Орын")} ${i + 1}, ${id !== 0n ? t("продано", "сатылған") : t("свободно", "бос")}`}
                aria-pressed={seat === i + 1}
                onClick={() => setSeat(i + 1)}
              >
                {id !== 0n ? "×" : i + 1}
              </button>
            ))}
          </div>
          <div className="legend">
            <span>
              <i />
              {t("Свободно", "Бос")}
            </span>
            <span>
              <i className="chosen" />
              {t("Выбрано", "Таңдалған")}
            </span>
            <span>
              <i className="sold">×</i>
              {t("Продано", "Сатылған")}
            </span>
          </div>
        </section>
        <aside className="checkout">
          <h2>{t("Ваш выбор", "Таңдауыңыз")}</h2>
          <p>{e.title}</p>
          <dl>
            <div>
              <dt>{t("Место", "Орын")}</dt>
              <dd>{seat || "—"}</dd>
            </div>
            <div>
              <dt>{t("Стоимость", "Құны")}</dt>
              <dd>{formatEther(e.ticketPrice)} ETH</dd>
            </div>
          </dl>
          <p className="muted">
            {t(
              "Тестовый ETH. Комиссия сети оплачивается отдельно. Выбор места не является бронью.",
              "Тестілік ETH. Желі комиссиясы бөлек төленеді. Орын таңдау бронь болып саналмайды.",
            )}
          </p>
          {error && <Notice code={error} />}
          <button
            className="button wide"
            disabled={
              busy ||
              (!!account &&
                chain === config.chainId &&
                (!available || !selectedFree))
            }
            onClick={() => {
              if (!account) void connect();
              else if (chain !== config.chainId) void switchChain();
              else void buy().catch(() => setError("transactionError"));
            }}
          >
            {!account
              ? t("Подключить кошелек", "Әмиянды қосу")
              : chain !== config.chainId
                ? t("Сменить сеть", "Желіні ауыстыру")
                : t("Купить билет", "Билет сатып алу")}
          </button>
          {!available && (
            <p>
              <Status status={eventStatus(e)} />
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
