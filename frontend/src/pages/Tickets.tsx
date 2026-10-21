import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowUpRight } from "lucide-react";
import { formatEther } from "ethers";
import { useApp } from "../context/AppContext";
import { config, configured, listing, read, ticketsFor } from "../lib/chain";
import {
  dateLabel,
  positiveId,
  ticketStatus,
  type Ticket,
} from "../lib/domain";
import { useLoad } from "../lib/useLoad";
import {
  Empty,
  Loading,
  Notice,
  Poster,
  Refresh,
  RequireWallet,
  Setup,
  Status,
} from "../components/Common";
export function MyTickets() {
  const { t, lang, account, version } = useApp();
  const s = useLoad(
    "tickets:" + account + ":" + version,
    async () => {
      const tickets = await ticketsFor(account);
      return Promise.all(
        tickets.map(async (ticket) => ({
          ticket,
          event: await listing(ticket.eventId),
        })),
      );
    },
    configured && !!account,
    20000,
  );
  if (!configured) return <Setup />;
  if (!account) return <RequireWallet />;
  return (
    <>
      <div className="section-title">
        <div>
          <h1>{t("Мои билеты", "Менің билеттерім")}</h1>
          <p>
            {t(
              "Все ваши встречи — в одном месте.",
              "Барлық кездесуіңіз — бір жерде.",
            )}
          </p>
        </div>
        <Refresh />
      </div>
      {s.loading ? (
        <Loading />
      ) : s.error ? (
        <Notice code={s.error} />
      ) : !s.data?.length ? (
        <Empty title={t("История только начинается", "Бәрі енді басталады")}>
          <p>
            {t(
              "После покупки здесь появится ваш билет.",
              "Сатып алғаннан кейін билетіңіз осында пайда болады.",
            )}
          </p>
          <Link className="button" to="/">
            {t("Открыть афишу", "Афишаны ашу")}
          </Link>
        </Empty>
      ) : (
        <div className="ticket-list">
          {s.data.map(({ ticket, event }) => (
            <Link
              className="ticket-row"
              key={String(ticket.id)}
              to={"/tickets/" + ticket.id}
            >
              <Poster src={event.metadata.posterUrl} title={event.title} />
              <div>
                <Status status={ticketStatus(ticket, event)} />
                <h2>{event.title}</h2>
                <p>{dateLabel(event.startsAt, lang)} · UTC+5</p>
                <p>
                  {t("Место", "Орын")} {String(ticket.seatNumber)} ·{" "}
                  {t("Билет", "Билет")} #{String(ticket.id)}
                </p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
export function TicketDetail() {
  const { ticketId = "" } = useParams();
  const { t, lang, account, version, run, busy } = useApp();
  const s = useLoad(
    "ticket:" + ticketId + ":" + version,
    async () => {
      const ticket = await read<Ticket>("getTicket", [positiveId(ticketId)]);
      return { ticket, event: await listing(ticket.eventId) };
    },
    configured,
    15000,
  );
  if (!configured) return <Setup />;
  if (s.loading) return <Loading />;
  if (s.error) return <Notice code={s.error} />;
  if (!s.data) return null;
  const { ticket: ticket, event } = s.data;
  const status = ticketStatus(ticket, event);
  const owner = account.toLowerCase() === ticket.owner.toLowerCase();
  const qr = JSON.stringify({
    version: 1,
    chainId: String(config.chainId),
    contractAddress: config.address,
    ticketId: String(ticket.id),
  });
  return (
    <>
      <div className="section-title no-print">
        <h1>{t("Ваш билет", "Билетіңіз")}</h1>
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={17} />
          {t("Печать", "Басып шығару")}
        </button>
      </div>
      <article className="ticket-paper">
        <div className="paper-main">
          <span className="wordmark">TicketChain</span>
          <h2>{event.title}</h2>
          <Status status={status} />
          <p>{dateLabel(event.startsAt, lang)} · UTC+5</p>
          <p>
            {event.metadata.city} · {event.metadata.venue}
          </p>
          <dl className="ticket-facts">
            <div>
              <dt>{t("Место", "Орын")}</dt>
              <dd>{String(ticket.seatNumber)}</dd>
            </div>
            <div>
              <dt>{t("Билет", "Билет")}</dt>
              <dd>#{String(ticket.id)}</dd>
            </div>
            <div>
              <dt>{t("Оплачено", "Төленді")}</dt>
              <dd>{formatEther(ticket.pricePaid)} ETH</dd>
            </div>
          </dl>
          <p className="muted">{t("Владелец", "Иесі")}</p>
          <code className="address">{ticket.owner}</code>
        </div>
        <div className="paper-qr">
          <QRCodeSVG value={qr} size={190} marginSize={2} />
          <p>{t("Покажите при входе", "Кіргенде көрсетіңіз")}</p>
          <small>
            {t(
              "QR — идентификатор, а не доказательство владения. Проверяющий сверит владельца отдельно.",
              "QR — идентификатор, иелік дәлелі емес. Тексеруші билет иесін бөлек тексереді.",
            )}
          </small>
        </div>
      </article>
      {status === "refundAvailable" && (
        <section className="refund no-print">
          <h2>{t("Событие отменено", "Іс-шара тоқтатылған")}</h2>
          <p>
            {t(
              "Владелец может вернуть стоимость билета. Комиссия сети не возвращается.",
              "Билет иесі билет құнын қайтара алады. Желі комиссиясы қайтарылмайды.",
            )}
          </p>
          <button
            className="button"
            disabled={!owner || busy}
            onClick={() => void run("refundTicket", [ticket.id])}
          >
            {t("Вернуть", "Қайтару")} {formatEther(ticket.pricePaid)} ETH
          </button>
          {!owner && (
            <p>
              {t(
                "Подключите кошелек владельца.",
                "Билет иесінің әмиянын қосыңыз.",
              )}
            </p>
          )}
        </section>
      )}
      <p className="muted no-print">
        {t(
          "Сведения о билете публичны в блокчейне.",
          "Билет туралы деректер блокчейнде ашық.",
        )}
      </p>
    </>
  );
}
