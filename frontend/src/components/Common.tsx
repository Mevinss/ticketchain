import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Ticket as TicketIcon,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import { useApp } from "../context/AppContext";
import { dateLabel, eventStatus, type Listing } from "../lib/domain";
import { config, configured } from "../lib/chain";
export function Notice({
  code,
  children,
}: {
  code?: string;
  children?: React.ReactNode;
}) {
  const { msg } = useApp();
  return (
    <div className="notice" role="status">
      <AlertCircle size={20} />
      <div>{code ? msg(code) : children}</div>
    </div>
  );
}
export function Loading() {
  const { t } = useApp();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      {t("Загружаем данные…", "Деректер жүктелуде…")}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <TicketIcon size={36} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Status({ status }: { status: string }) {
  const { msg } = useApp();
  return <span className={"status status-" + status}>{msg(status)}</span>;
}
export function Poster({
  src,
  title,
  className = "",
}: {
  src: string;
  title: string;
  className?: string;
}) {
  return (
    <img
      className={"poster " + className}
      src={src || "/posters/fallback.svg"}
      alt={title}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/posters/fallback.svg";
      }}
    />
  );
}
export function EventCard({ event: e }: { event: Listing }) {
  const { t, lang } = useApp();
  return (
    <article className="event-card">
      <Link to={"/events/" + e.id}>
        <Poster src={e.metadata.posterUrl} title={e.title} />
        <div className="event-card-body">
          <div className="card-top">
            <span>{e.metadata.category || t("Событие", "Іс-шара")}</span>
            <Status status={eventStatus(e)} />
          </div>
          <h3>{e.title}</h3>
          <p>
            <CalendarDays size={15} />
            {dateLabel(e.startsAt, lang)}
          </p>
          <p>
            <MapPin size={15} />
            {[e.metadata.city, e.metadata.venue].filter(Boolean).join(" · ") ||
              t("Площадка уточняется", "Өтетін орны нақтылануда")}
          </p>
          <div className="card-bottom">
            <strong>
              {formatEther(e.ticketPrice)} <small>ETH</small>
            </strong>
            <span>
              {String(e.capacity - e.ticketsSold)} {t("мест", "орын")}{" "}
              <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
export function Setup() {
  const { t } = useApp();
  return (
    <section className="setup">
      <div>
        <h2>{t("Подключите ваш контракт", "Контрактты қосыңыз")}</h2>
        <p>
          {t(
            "Сайт готов подключиться к TicketChain. Для реальных покупок нужны адрес развернутого контракта и RPC.",
            "Сайт TicketChain контрактына қосылуға дайын. Сатып алу үшін орналастырылған контракт адресі мен RPC керек.",
          )}
        </p>
      </div>
      <details>
        <summary>{t("Как настроить подключение", "Қосылуды баптау")}</summary>
        <ol>
          <li>
            {t(
              "Скопируйте frontend/.env.example в frontend/.env.",
              "frontend/.env.example файлын frontend/.env ретінде көшіріңіз.",
            )}
          </li>
          <li>
            {t(
              "Укажите VITE_CONTRACT_ADDRESS и VITE_RPC_URL.",
              "VITE_CONTRACT_ADDRESS пен VITE_RPC_URL көрсетіңіз.",
            )}
          </li>
          <li>
            {t(
              "Перезапустите npm run dev. Для публикации пересоберите npm run build.",
              "npm run dev қайта іске қосыңыз. Жариялау үшін npm run build орындаңыз.",
            )}
          </li>
        </ol>
        <code>VITE_CHAIN_ID=11155111</code>
      </details>
    </section>
  );
}
export function RequireWallet() {
  const { t, connect } = useApp();
  return (
    <Empty title={t("Подключите кошелек", "Әмиянды қосыңыз")}>
      <p>
        {t(
          "Ваш адрес — ключ к билетам и доступным действиям.",
          "Адресіңіз билеттер мен қолжетімді әрекеттерді анықтайды.",
        )}
      </p>
      <button className="button" onClick={connect}>
        {t("Подключить MetaMask", "MetaMask қосу")}
      </button>
    </Empty>
  );
}
export function Refresh() {
  const { refresh, t } = useApp();
  return (
    <button className="button secondary" onClick={refresh}>
      <RefreshCw size={16} />
      {t("Обновить", "Жаңарту")}
    </button>
  );
}
export function Transactions() {
  const { txs, msg, t, recheck } = useApp();
  if (!txs.length) return null;
  return (
    <section className="transactions" aria-live="polite">
      <details open>
        <summary>
          {t("Транзакции", "Транзакциялар")} ({txs.length})
        </summary>
        {txs.map((tx) => (
          <div className={"transaction " + tx.status} key={tx.id}>
            <span>
              {tx.status === "pending" || tx.status === "awaiting" ? (
                <LoaderCircle size={16} className="spin" />
              ) : null}
              <strong>{msg(tx.status)}</strong>
              <small>{tx.name}</small>
            </span>
            {tx.error && <p>{msg(tx.error)}</p>}
            {tx.status === "pending" && (
              <button
                className="button secondary"
                onClick={() => void recheck(tx.id)}
              >
                {t("Проверить статус", "Күйін тексеру")}
              </button>
            )}
            {tx.hash && (
              <div className="address">
                {config.explorer && /^https?:\/\//.test(config.explorer) ? (
                  <a
                    href={`${config.explorer.replace(/\/$/, "")}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Посмотреть транзакцию", "Транзакцияны көру")} ↗
                  </a>
                ) : (
                  <code>{tx.hash}</code>
                )}
              </div>
            )}
          </div>
        ))}
      </details>
    </section>
  );
}
