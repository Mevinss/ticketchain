import { useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "ethers";
import { useApp } from "../context/AppContext";
import { getListings, errorKey } from "../lib/chain";
import { sessionSeeds } from "../lib/sessions";
import {
  nowSeconds,
  toDateInput,
  toTimestamp,
  type Listing,
} from "../lib/domain";
import { Notice } from "./Common";

export function AfishaPublisher({ events }: { events: Listing[] }) {
  const { t, run, busy, refresh } = useApp();
  const [start, setStart] = useState(() => toDateInput(nowSeconds() + 86400n));
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  async function publish(seed: (typeof sessionSeeds)[number]) {
    setError("");
    setPublishing(true);
    try {
      const begins = toTimestamp(start);
      if (begins <= nowSeconds()) throw Error("InvalidTimeRange");
      // Re-read the chain before sending; do not trust an old page snapshot.
      if ((await getListings()).some((e) => e.metadataURI === seed.uri)) {
        refresh();
        return;
      }
      const response = await fetch(seed.uri);
      if (!response.ok) throw Error("metadataError");
      const metadata = await response.json();
      if (metadata.city !== seed.city) throw Error("metadataError");
      const receipt = await run("createEvent", [
        `${seed.item.title} · ${seed.city} · DEMO`,
        seed.uri,
        begins,
        begins + BigInt(seed.item.duration * 60),
        parseEther("0.001"),
        40,
      ]);
      if (receipt) setDone((xs) => [...xs, seed.uri]);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setPublishing(false);
    }
  }
  return (
    <section className="create-event">
      <h2>
        {t(
          "Кино и театр — билеты в блокчейне",
          "Кино және театр — блокчейн билеттері",
        )}
      </h2>
      <p>
        {t(
          "7 учебных сеансов: 40 мест, 0.001 тестового ETH за билет. Каждый сеанс создаётся отдельной транзакцией MetaMask. Эти билеты не дают прохода на реальные показы.",
          "7 оқу сеансы: 40 орын, билетке 0.001 тестілік ETH. Әр сеанс жеке MetaMask транзакциясымен жасалады. Бұл билеттер нақты көрсетілімге кіруге құқық бермейді.",
        )}
      </p>
      <label>
        {t("Начало учебного сеанса · UTC+5", "Оқу сеансының басталуы · UTC+5")}
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          disabled={busy || publishing}
        />
      </label>
      {error && <Notice code={error} />}
      <div className="session-list">
        {sessionSeeds.map((seed) => {
          const existing = events.find((e) => e.metadataURI === seed.uri);
          return (
            <div className="session-row" key={seed.key}>
              <span>
                <strong>{seed.item.title}</strong>
                <br />
                {seed.city} · {seed.item.duration} {t("мин", "мин")}
              </span>
              {existing ? (
                <Link
                  className="button secondary"
                  to={`/events/${existing.id}`}
                >
                  {t("Открыть сеанс", "Сеансты ашу")} #{String(existing.id)}
                </Link>
              ) : (
                <button
                  className="button"
                  disabled={busy || publishing || done.includes(seed.uri)}
                  onClick={() => void publish(seed)}
                >
                  {done.includes(seed.uri)
                    ? t("Создано", "Жасалды")
                    : t("Создать сеанс", "Сеанс жасау")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
