import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Heart,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  afisha,
  afishaDate,
  filterAfisha,
  verifiedOn,
  type AfishaItem,
} from "../lib/afisha";

function Cover({ item }: { item: AfishaItem }) {
  const { t } = useApp();
  const [failed, setFailed] = useState(false);
  return (
    <div className="afisha-cover" style={{ backgroundColor: item.color }}>
      {item.poster && !failed ? (
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="type-cover">
          <span>
            {item.kind === "cinema"
              ? t("КИНО", "КИНО")
              : t("НА СЦЕНЕ", "САХНАДА")}
          </span>
          <strong>{item.title}</strong>
          <small>{t("Обложка TicketChain", "TicketChain мұқабасы")}</small>
        </div>
      )}
      <span className="age-label">{item.age}</span>
    </div>
  );
}
export default function CityAfisha() {
  const { t, lang } = useApp();
  const [city, setCity] = useState(""),
    [kind, setKind] = useState(""),
    [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AfishaItem | null>(null);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("tc-afisha-saved") || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  const [onlySaved, setOnlySaved] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const labelDate = (x: AfishaItem) =>
    x.date
      ? afishaDate(x.date, lang)
      : t(
          "В прокате · расписание у кинотеатра",
          "Прокатта · кесте кинотеатрда",
        );
  function favorite(id: string) {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem("tc-afisha-saved", JSON.stringify(next));
    } catch {
      /* session remains usable */
    }
  }
  const visible = filterAfisha(afisha, city, kind, query).filter(
    (x) => !onlySaved || saved.includes(x.id),
  );
  return (
    <section
      className="city-afisha"
      id="city-afisha"
      aria-labelledby="city-heading"
    >
      <div className="section-title">
        <div>
          <h2 id="city-heading">{t("Город зовёт.", "Қала шақырады.")}</h2>
          <p>
            {t(
              "Кино и театр в Астане и Алматы",
              "Астана мен Алматыдағы кино және театр",
            )}
          </p>
        </div>
        <span className="source-date">
          {t("Афиша проверена", "Афиша тексерілді")}: {verifiedOn}
        </span>
      </div>
      <div className="afisha-toolbar">
        <div
          className="segmented"
          role="group"
          aria-label={t("Город афиши", "Афиша қаласы")}
        >
          {[
            ["", t("Два города", "Екі қала")],
            ["Астана", "Астана"],
            ["Алматы", "Алматы"],
          ].map(([v, label]) => (
            <button
              key={v}
              aria-pressed={city === v}
              onClick={() => setCity(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="afisha-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Что посмотрим?", "Не көреміз?")}
            aria-label={t("Поиск по городской афише", "Қалалық афишадан іздеу")}
          />
        </label>
      </div>
      <div className="afisha-tabs">
        <div role="group" aria-label={t("Вид события", "Іс-шара түрі")}>
          {[
            ["", t("Всё", "Барлығы")],
            ["cinema", t("Кино", "Кино")],
            ["theatre", t("Театр", "Театр")],
          ].map(([v, label]) => (
            <button
              key={v}
              className={kind === v ? "selected" : ""}
              aria-pressed={kind === v}
              onClick={() => setKind(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="chip"
          aria-pressed={onlySaved}
          onClick={() => setOnlySaved(!onlySaved)}
        >
          <Heart size={16} />
          {t("Сохранённое", "Сақталғандар")} {saved.length || ""}
        </button>
      </div>
      <p className="afisha-result" aria-live="polite">
        {t("Найдено", "Табылды")}: {visible.length}
      </p>
      <div className="afisha-grid">
        {visible.map((item) => (
          <article className="afisha-card" key={item.id}>
            <button
              className="afisha-open"
              onClick={() => setSelected(item)}
              aria-label={t("Подробнее: ", "Толығырақ: ") + item.title}
            >
              <Cover item={item} />
              <div className="afisha-copy">
                <span className="afisha-kind">
                  {item.kind === "cinema"
                    ? t("Кино", "Кино")
                    : t("Театр", "Театр")}{" "}
                  · {item.duration} {t("мин", "мин")}
                </span>
                <h3>{item.title}</h3>
                <p>
                  <CalendarDays size={15} />
                  {labelDate(item)}
                </p>
                <p>
                  <MapPin size={15} />
                  {item.cities.join(" / ")}
                </p>
                <span className="afisha-more">
                  {t("Подробнее", "Толығырақ")}
                  <ArrowUpRight size={19} />
                </span>
              </div>
            </button>
            <button
              className={
                "afisha-save " + (saved.includes(item.id) ? "active" : "")
              }
              aria-label={t("Сохранить: ", "Сақтау: ") + item.title}
              aria-pressed={saved.includes(item.id)}
              onClick={() => favorite(item.id)}
            >
              <Heart size={19} />
            </button>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="empty">
          <h3>{t("Ничего не найдено", "Ештеңе табылмады")}</h3>
          <button
            className="button secondary"
            onClick={() => {
              setCity("");
              setKind("");
              setQuery("");
              setOnlySaved(false);
            }}
          >
            {t("Сбросить фильтры", "Сүзгілерді тазарту")}
          </button>
        </div>
      )}
      <p className="afisha-disclaimer">
        {t(
          "Справочная афиша по данным Ticketon. Расписание может измениться. Реальные билеты доступны у организатора; учебные билеты Sepolia находятся ниже.",
          "Ticketon деректеріне негізделген анықтамалық афиша. Кесте өзгеруі мүмкін. Нақты билеттер ұйымдастырушыда; Sepolia оқу билеттері төменде.",
        )}
      </p>
      <dialog
        ref={dialog}
        className="afisha-dialog"
        aria-labelledby="afisha-dialog-title"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {selected && (
          <>
            <button
              className="dialog-close icon-button"
              onClick={() => setSelected(null)}
              aria-label={t("Закрыть", "Жабу")}
            >
              <X />
            </button>
            <div className="dialog-layout">
              <Cover item={selected} />
              <div className="dialog-copy">
                <h2 id="afisha-dialog-title">{selected.title}</h2>
                <p className="muted">
                  {selected.age} · {selected.duration} {t("минут", "минут")}
                </p>
                <p>{selected.description[lang === "kk" ? 1 : 0]}</p>
                <p>
                  <strong>{selected.venue[lang === "kk" ? 1 : 0]}</strong>
                  <br />
                  {selected.cities.join(" / ")}
                  <br />
                  {labelDate(selected)}
                </p>
                <a
                  className="button"
                  href={selected.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(
                    "Сеансы и билеты на Ticketon",
                    "Ticketon: сеанстар мен билеттер",
                  )}
                  <ArrowUpRight size={18} />
                </a>
                <p className="afisha-disclaimer">
                  {t(
                    "Откроется сайт продавца. Этот раздел не выпускает блокчейн-билеты.",
                    "Сатушының сайты ашылады. Бұл бөлім блокчейн билеттерін шығармайды.",
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
