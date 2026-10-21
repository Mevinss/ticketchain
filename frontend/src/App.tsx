import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Link } from "react-router-dom";
import { Ticket, Wallet, Menu, X, LogOut, ArrowUpRight } from "lucide-react";
import { useApp } from "./context/AppContext";
import { config } from "./lib/chain";
import { shortAddress } from "./lib/domain";
import { Notice, Transactions } from "./components/Common";
import Catalog from "./pages/Catalog";
import EventDetail from "./pages/EventDetail";
import { MyTickets, TicketDetail } from "./pages/Tickets";
import Admin from "./pages/Admin";
import CheckIn from "./pages/CheckIn";
export default function App() {
  const {
    t,
    lang,
    setLang,
    account,
    chain,
    connect,
    disconnect,
    switchChain,
    walletError,
  } = useApp();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <a className="skip" href="#main">
        {t("К содержимому", "Мазмұнға өту")}
      </a>
      <div className="network-strip">
        {config.chainId === 11155111
          ? "SEPOLIA"
          : t("ТЕСТОВАЯ СЕТЬ", "ТЕСТІЛІК ЖЕЛІ")}
        <span>·</span>
        {t(
          "Учебный проект. Только тестовый ETH.",
          "Оқу жобасы. Тек тестілік ETH.",
        )}
      </div>
      <header>
        <div className="header-inner">
          <Link to="/" className="logo">
            <Ticket size={28} />
            <span>
              Ticket<span>Chain</span>
            </span>
          </Link>
          <nav
            className={menu ? "open" : ""}
            aria-label={t("Основная навигация", "Негізгі навигация")}
            onClick={() => setMenu(false)}
          >
            <NavLink to="/" end>
              {t("Афиша", "Афиша")}
            </NavLink>
            <NavLink to="/my-tickets">{t("Мои билеты", "Билеттерім")}</NavLink>
            <NavLink to="/admin">{t("Организатор", "Ұйымдастырушы")}</NavLink>
            <NavLink to="/check-in">{t("Проверка", "Тексеру")}</NavLink>
          </nav>
          <div className="header-actions">
            <div
              className="language-switch"
              role="group"
              aria-label={t("Язык сайта", "Сайт тілі")}
            >
              <button
                lang="kk"
                aria-pressed={lang === "kk"}
                onClick={() => setLang("kk")}
              >
                ҚАЗ
              </button>
              <button
                lang="ru"
                aria-pressed={lang === "ru"}
                onClick={() => setLang("ru")}
              >
                РУС
              </button>
            </div>
            <button className="button wallet" onClick={() => void connect()}>
              <Wallet size={17} />
              <span>
                {account ? shortAddress(account) : t("Кошелек", "Әмиян")}
              </span>
            </button>
            {account && (
              <button
                className="icon-button"
                aria-label={t("Отключить", "Ажырату")}
                onClick={disconnect}
              >
                <LogOut size={17} />
              </button>
            )}
            <button
              className="icon-button mobile-menu"
              aria-label={t("Меню", "Мәзір")}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <div className="container">
          {walletError && <Notice code={walletError} />}{" "}
          {account && chain !== config.chainId && (
            <Notice>
              <span>
                {t(
                  "Кошелек подключен к другой сети.",
                  "Әмиян басқа желіге қосылған.",
                )}
              </span>{" "}
              <button
                className="text-button"
                onClick={() => void switchChain()}
              >
                {t("Переключить сеть", "Желіні ауыстыру")}
              </button>
            </Notice>
          )}
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>404</h1>
                  <Link to="/">{t("Вернуться к афише", "Афишаға оралу")}</Link>
                </div>
              }
            />
          </Routes>
          <Transactions />
        </div>
      </main>
      <footer>
        <div className="container">
          <Link className="logo" to="/">
            <Ticket size={25} />
            TicketChain
          </Link>
          <p>
            {t(
              "Больше встреч. Больше впечатлений.",
              "Көбірек кездесу. Көбірек әсер.",
            )}
          </p>
          <span>{t("Учебный dApp · Ethereum", "Оқу dApp · Ethereum")}</span>
          <a
            href="https://github.com/Mevinss/ticketchain"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={14} />
          </a>
        </div>
      </footer>
    </>
  );
}
