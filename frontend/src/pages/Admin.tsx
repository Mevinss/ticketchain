import { AfishaPublisher } from "../components/AfishaPublisher";
import { useState } from "react";
import { formatEther, isAddress, parseEther, ZeroAddress } from "ethers";
import { useApp } from "../context/AppContext";
import { configured, getListings, read, errorKey } from "../lib/chain";
import {
  canCancel,
  dateLabel,
  nowSeconds,
  toDateInput,
  toTimestamp,
  type Listing,
} from "../lib/domain";
import { useLoad } from "../lib/useLoad";
import {
  Empty,
  Loading,
  Notice,
  Refresh,
  RequireWallet,
  Setup,
  Status,
} from "../components/Common";
import { MetadataEditor } from "../components/MetadataEditor";
function EventAdmin({ e }: { e: Listing }) {
  const { t, lang, run, busy } = useApp();
  const [checker, setChecker] = useState("");
  const [confirm, setConfirm] = useState(false);
  const now = nowSeconds();
  const checkerValid = isAddress(checker) && checker !== ZeroAddress;
  return (
    <article className="admin-event">
      <div className="section-title">
        <div>
          <h3>{e.title}</h3>
          <p>
            #{String(e.id)} · {dateLabel(e.startsAt, lang)} · UTC+5
          </p>
        </div>
        {e.cancelled && <Status status="cancelled" />}
      </div>
      <dl className="admin-stats">
        <div>
          <dt>{t("Продано", "Сатылды")}</dt>
          <dd>
            {String(e.ticketsSold)}/{String(e.capacity)}
          </dd>
        </div>
        <div>
          <dt>{t("Вошли", "Кірді")}</dt>
          <dd>{String(e.checkedInCount)}</dd>
        </div>
        <div>
          <dt>{t("Возвраты", "Қайтарылды")}</dt>
          <dd>{String(e.refundedCount)}</dd>
        </div>
        <div>
          <dt>{t("В контракте", "Контрактта")}</dt>
          <dd>{formatEther(e.escrowBalance)} ETH</dd>
        </div>
      </dl>
      <div className="actions">
        <button
          className="button secondary"
          disabled={busy || e.cancelled || now >= e.startsAt}
          onClick={() =>
            void run("setEventSalesPaused", [e.id, !e.salesPaused])
          }
        >
          {e.salesPaused
            ? t("Возобновить продажи", "Сатылымды жалғастыру")
            : t("Остановить продажи", "Сатылымды тоқтату")}
        </button>
        <button
          className="button secondary"
          disabled={
            busy || e.cancelled || now < e.endsAt || e.proceedsWithdrawn
          }
          onClick={() => void run("withdrawProceeds", [e.id])}
        >
          {e.proceedsWithdrawn
            ? t("Средства выведены", "Қаражат шығарылған")
            : t("Вывести средства", "Қаражат шығару")}
        </button>
        <button
          className="button danger"
          disabled={busy || !canCancel(e)}
          onClick={() => setConfirm(!confirm)}
        >
          {t("Отменить событие", "Іс-шараны тоқтату")}
        </button>
      </div>
      {confirm && (
        <div className="confirm">
          <p>
            {t(
              "Отмена необратима. Все владельцы смогут вернуть стоимость своих билетов. Продолжить?",
              "Тоқтатуды кері қайтару мүмкін емес. Барлық билет иелері төлемін қайтара алады. Жалғастыру керек пе?",
            )}
          </p>
          <div className="actions">
            <button
              className="button danger"
              disabled={busy || !canCancel(e)}
              onClick={async () => {
                await run("cancelEvent", [e.id]);
                setConfirm(false);
              }}
            >
              {t("Подтвердить отмену", "Тоқтатуды растау")}
            </button>
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              {t("Назад", "Артқа")}
            </button>
          </div>
        </div>
      )}
      <div className="checker-form">
        <label>
          {t("Адрес проверяющего", "Тексеруші адресі")}
          <input
            value={checker}
            onChange={(x) => setChecker(x.target.value)}
            placeholder="0x…"
          />
        </label>
        <button
          className="button secondary"
          disabled={busy || !checkerValid}
          onClick={() => void run("setChecker", [e.id, checker, true])}
        >
          {t("Назначить", "Тағайындау")}
        </button>
        <button
          className="button secondary"
          disabled={busy || !checkerValid}
          onClick={() => void run("setChecker", [e.id, checker, false])}
        >
          {t("Отозвать", "Алып тастау")}
        </button>
      </div>
    </article>
  );
}
export default function Admin() {
  const { t, account, version, run, busy } = useApp();
  const [title, setTitle] = useState(""),
    [uri, setUri] = useState(""),
    [start, setStart] = useState(() => toDateInput(nowSeconds() + 86400n)),
    [end, setEnd] = useState(() => toDateInput(nowSeconds() + 93600n)),
    [price, setPrice] = useState("0.001"),
    [capacity, setCapacity] = useState("40"),
    [error, setError] = useState("");
  const s = useLoad(
    "admin:" + account + ":" + version,
    async () => {
      const admin = await read<string>("admin");
      return { admin, events: await getListings() };
    },
    configured && !!account,
    30000,
  );
  if (!configured) return <Setup />;
  if (!account) return <RequireWallet />;
  if (s.loading) return <Loading />;
  if (s.error) return <Notice code={s.error} />;
  if (!s.data) return null;
  const isAdmin = s.data.admin.toLowerCase() === account.toLowerCase();
  const mine = s.data.events.filter(
    (e) => e.organizer.toLowerCase() === account.toLowerCase(),
  );
  if (!isAdmin && !mine.length)
    return (
      <Empty title={t("Доступ для организатора", "Ұйымдастырушыға арналған")}>
        <p>
          {t(
            "Подключите аккаунт, который развернул контракт.",
            "Контрактты орналастырған аккаунтты қосыңыз.",
          )}
        </p>
      </Empty>
    );
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const starts = toTimestamp(start),
        ends = toTimestamp(end),
        p = parseEther(price);
      if (!title.trim() || !uri.trim()) throw Error("EmptyString");
      if (!/^(https?:\/\/|ipfs:\/\/)/.test(uri)) throw Error("metadataError");
      if (starts <= nowSeconds() || ends <= starts)
        throw Error("InvalidTimeRange");
      if (p <= 0n) throw Error("InvalidPrice");
      if (
        !/^\d+$/.test(capacity) ||
        Number(capacity) < 1 ||
        Number(capacity) > 200
      )
        throw Error("InvalidCapacity");
      const receipt = await run("createEvent", [
        title.trim(),
        uri.trim(),
        starts,
        ends,
        p,
        Number(capacity),
      ]);
      if (receipt) {
        setTitle("");
        setUri("");
      }
    } catch (err) {
      setError(errorKey(err));
    }
  }
  return (
    <>
      <div className="section-title">
        <div>
          <h1>{t("Панель организатора", "Ұйымдастырушы панелі")}</h1>
          <p>
            {t(
              "От первой афиши до последнего гостя.",
              "Алғашқы афишадан соңғы қонаққа дейін.",
            )}
          </p>
        </div>
        <Refresh />
      </div>
      {isAdmin && <AfishaPublisher events={s.data.events} />}
      {isAdmin && (
        <section className="create-event">
          <h2>{t("Новое событие", "Жаңа іс-шара")}</h2>
          <MetadataEditor onUrl={setUri} />
          <form onSubmit={create}>
            <div className="form-grid">
              <label>
                {t("Название", "Атауы")}
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                />
              </label>
              <label>
                Metadata URL
                <input
                  required
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  placeholder="https://…/metadata/event.json"
                />
              </label>
              <label>
                {t("Начало · UTC+5", "Басталуы · UTC+5")}
                <input
                  required
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                {t("Окончание · UTC+5", "Аяқталуы · UTC+5")}
                <input
                  required
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
              <label>
                {t("Цена · тестовый ETH", "Бағасы · тестілік ETH")}
                <input
                  required
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label>
                {t("Количество мест · 1–200", "Орын саны · 1–200")}
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </label>
            </div>
            <p className="muted">
              {t(
                "После создания цену, время и вместимость изменить нельзя.",
                "Жасағаннан кейін баға, уақыт және орын санын өзгерту мүмкін емес.",
              )}
            </p>
            {error && <Notice code={error} />}
            <button className="button" disabled={busy}>
              {t("Создать в блокчейне", "Блокчейнде жасау")}
            </button>
          </form>
        </section>
      )}
      <section>
        <h2>{t("Ваши события", "Іс-шараларыңыз")}</h2>
        {mine.length ? (
          mine.map((e) => <EventAdmin key={String(e.id)} e={e} />)
        ) : (
          <Empty
            title={t("Создайте первое событие", "Алғашқы іс-шараны жасаңыз")}
          />
        )}
      </section>
    </>
  );
}
