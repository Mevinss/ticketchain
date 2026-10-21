import { useState } from "react";
import CityAfisha from "../components/CityAfisha";
import { Search, ArrowUpRight, Heart, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { configured, getListings, validateDeployment } from "../lib/chain";
import { useLoad } from "../lib/useLoad";
import { toDateInput } from "../lib/domain";
import {
  Empty,
  EventCard,
  Loading,
  Notice,
  Poster,
  Refresh,
  Setup,
} from "../components/Common";
const samples = [
  ["night", "JAZZ / LIVE", "Вечер живого джаза", "Жанды джаз кеші"],
  ["cinema", "CINEMA CLUB", "Кино на большом экране", "Үлкен экрандағы кино"],
  ["standup", "STAND UP", "Смех без сценария", "Сценарийсіз күлкі"],
  ["theatre", "ON STAGE", "Театральный вечер", "Театр кеші"],
  ["campus", "CAMPUS FEST", "Встречаемся в кампусе", "Кампуста кездесеміз"],
  ["arena", "GAME NIGHT", "Киберспортивный турнир", "Киберспорт турнирі"],
];
export default function Catalog() {
  const { t, version } = useApp();
  const [search, setSearch] = useState(""),
    [city, setCity] = useState(""),
    [category, setCategory] = useState(""),
    [date, setDate] = useState(""),
    [sort, setSort] = useState("date"),
    [onlyFav, setOnlyFav] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("tc-favorites") || "[]");
    } catch {
      return [];
    }
  });
  const s = useLoad(
    "catalog:" + version,
    async () => {
      await validateDeployment();
      return getListings();
    },
    configured,
    30000,
  );
  const events = s.data || [];
  const cities = [
      ...new Set(events.map((e) => e.metadata.city).filter(Boolean)),
    ],
    cats = [...new Set(events.map((e) => e.metadata.category).filter(Boolean))];
  const visible = events
    .filter(
      (e) =>
        (e.title + " " + e.metadata.description)
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()) &&
        (!city || e.metadata.city === city) &&
        (!category || e.metadata.category === category) &&
        (!date || toDateInput(e.startsAt).startsWith(date)) &&
        (!onlyFav || favorites.includes(String(e.id))),
    )
    .sort((a, b) => {
      const x = sort === "price" ? a.ticketPrice : a.startsAt,
        y = sort === "price" ? b.ticketPrice : b.startsAt;
      return x < y ? -1 : x > y ? 1 : 0;
    });
  function favorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("tc-favorites", JSON.stringify(next));
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            {t("Этот вечер", "Бұл кеш")}
            <br />
            <em>{t("будет историей.", "есте қалады.")}</em>
          </h1>
          <p>
            {t(
              "Большой экран или живая сцена? Выбирайте кино и театр в Астане и Алматы. А технологию билета попробуйте в учебной сети Sepolia.",
              "Үлкен экран ба, әлде жанды сахна ма? Астана мен Алматыдағы кино мен театрды таңдаңыз. Билет технологиясын Sepolia оқу желісінде сынап көріңіз.",
            )}
          </p>
          <a className="button" href="#city-afisha">
            {t("Выбрать событие", "Іс-шара таңдау")}
            <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="big-ticket">
            <span>TICKETCHAIN</span>
            <strong>
              {t("ЭТО", "БҰЛ")}
              <br />
              {t("ТВОЙ", "СЕНІҢ")}
              <br />
              <i>{t("ВЕЧЕР.", "КЕШІҢ.")}</i>
            </strong>
            <div className="ticket-perf" />
            <p>{t("ВПЕЧАТЛЕНИЯ ОСТАЮТСЯ", "ӘСЕРЛЕР САҚТАЛАДЫ")}</p>
            <div className="barcode" />
          </div>
          <span className="hero-caption">
            {t("КИНО / ТЕАТР / ВСТРЕЧИ", "КИНО / ТЕАТР / КЕЗДЕСУ")}
          </span>
        </div>
      </section>
      <CityAfisha />
      {!configured && <Setup />}
      <section id="catalog">
        <div className="section-title">
          <div>
            <h2>{t("Билеты в блокчейне", "Блокчейндегі билеттер")}</h2>
            <p>
              {t(
                "Учебные сеансы Sepolia · не дают входа в настоящий кинотеатр",
                "Sepolia оқу сеанстары · нақты кинотеатрға кіруге жарамайды",
              )}
            </p>
          </div>
          {configured && <Refresh />}
        </div>
        {configured ? (
          <>
            <div className="filters">
              <label className="search">
                <Search size={19} />
                <input
                  aria-label={t("Поиск событий", "Іс-шара іздеу")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    "Название или настроение…",
                    "Атауы немесе көңіл күйі…",
                  )}
                />
              </label>
              <label>
                <span>{t("Город", "Қала")}</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">{t("Все города", "Барлық қала")}</option>
                  {cities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("Категория", "Санат")}</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">{t("Все категории", "Барлық санат")}</option>
                  {cats.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("Дата", "Күні")}</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            <div className="catalog-tools">
              <button
                className={"chip " + (onlyFav ? "selected" : "")}
                aria-pressed={onlyFav}
                onClick={() => setOnlyFav(!onlyFav)}
              >
                <Heart size={15} />
                {t("Избранное", "Таңдаулылар")}
              </button>
              <label>
                <SlidersHorizontal size={16} />
                <select
                  aria-label={t("Сортировка", "Сұрыптау")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="date">
                    {t("Ближайшие сначала", "Алдымен жақын күндер")}
                  </option>
                  <option value="price">{t("По цене", "Баға бойынша")}</option>
                </select>
              </label>
            </div>
            {s.loading ? (
              <Loading />
            ) : s.error ? (
              <Notice code={s.error} />
            ) : visible.length ? (
              <div className="event-grid">
                {visible.map((e) => (
                  <div className="event-wrap" key={String(e.id)}>
                    <EventCard event={e} />
                    <button
                      className={
                        "favorite " +
                        (favorites.includes(String(e.id)) ? "active" : "")
                      }
                      onClick={() => favorite(String(e.id))}
                      aria-label={t("В избранное", "Таңдаулыларға")}
                      aria-pressed={favorites.includes(String(e.id))}
                    >
                      <Heart size={19} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title={t("Пока ничего не найдено", "Әзірге ештеңе табылмады")}
              >
                <p>
                  {t(
                    "Измените фильтры или создайте первое событие.",
                    "Сүзгілерді өзгертіңіз немесе алғашқы іс-шараны жасаңыз.",
                  )}
                </p>
                <Link className="button secondary" to="/admin">
                  {t("Панель организатора", "Ұйымдастырушы панелі")}
                </Link>
              </Empty>
            )}
          </>
        ) : (
          <>
            <p className="sample-note">
              {t(
                "Примеры оформления. Это не реальные события и билеты пока не продаются.",
                "Безендіру үлгілері. Бұл нақты іс-шаралар емес, билеттер әлі сатылмайды.",
              )}
            </p>
            <div className="event-grid">
              {samples.map(([id, cat, ru, kk]) => (
                <article className="event-card sample" key={id}>
                  <Poster src={"/posters/" + id + ".svg"} title={t(ru, kk)} />
                  <div className="event-card-body">
                    <span className="muted">{cat}</span>
                    <h3>{t(ru, kk)}</h3>
                    <p>
                      {t(
                        "Пример · данные появятся после создания события",
                        "Үлгі · деректер іс-шара жасалғаннан кейін пайда болады",
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="bottom-note">
        <h2>{t("Ваш билет. Ваш кошелек.", "Билетіңіз. Әмияныңыз.")}</h2>
        <p>
          {t(
            "Покупка и вход подтверждаются контрактом. Учебный проект: все платежи проходят в тестовой сети.",
            "Сатып алу мен кіруді контракт растайды. Оқу жобасы: барлық төлемдер тестілік желіде өтеді.",
          )}
        </p>
      </section>
    </>
  );
}
