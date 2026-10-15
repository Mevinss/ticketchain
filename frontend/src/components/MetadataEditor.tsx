import { useState } from "react";
import { Download } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  loadMetadata,
  normalizeMetadata,
  safeUrl,
  type Metadata,
} from "../lib/domain";
import { Notice } from "./Common";
export function MetadataEditor({ onUrl }: { onUrl: (s: string) => void }) {
  const { t } = useApp();
  const [d, set] = useState({
    description: "",
    city: "",
    venue: "",
    category: "",
    posterUrl: "",
  });
  const [url, setUrl] = useState("");
  const [state, setState] = useState("");
  const [preview, setPreview] = useState<Metadata | null>(null);
  function download() {
    const data = { ...d, posterUrl: safeUrl(d.posterUrl, true) };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "event-metadata.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  return (
    <details className="metadata-editor">
      <summary>
        {t(
          "Подготовить описание события (metadata)",
          "Іс-шара сипаттамасын дайындау (metadata)",
        )}
      </summary>
      <p>
        {t(
          "Создайте JSON, разместите на публичном хостинге и вставьте его URL. Скачивание не публикует файл.",
          "JSON жасап, ашық хостингке орналастырыңыз да, URL енгізіңіз. Файлды жүктеу оны жарияламайды.",
        )}
      </p>
      <div className="form-grid">
        {(["city", "venue", "category", "posterUrl"] as const).map((key, i) => (
          <label key={key}>
            {
              [
                t("Город", "Қала"),
                t("Площадка", "Өтетін орны"),
                t("Категория", "Санат"),
                t("URL постера", "Постер URL-і"),
              ][i]
            }
            <input
              value={d[key]}
              onChange={(e) => set({ ...d, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <label>
        {t("Описание", "Сипаттама")}
        <textarea
          value={d.description}
          onChange={(e) => set({ ...d, description: e.target.value })}
        />
      </label>
      <button type="button" className="button secondary" onClick={download}>
        <Download size={16} />
        {t("Скачать JSON", "JSON жүктеу")}
      </button>
      <label>
        {t("URL опубликованного JSON", "Жарияланған JSON URL-і")}
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreview(null);
            setState("");
          }}
          placeholder="https://…/metadata/event.json"
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={state === "loading"}
        onClick={async () => {
          setState("loading");
          try {
            const m = await loadMetadata(url);
            setPreview(m);
            onUrl(url);
            setState("ok");
          } catch {
            setState("metadataError");
          }
        }}
      >
        {t("Проверить и использовать URL", "URL тексеріп қолдану")}
      </button>
      {state === "metadataError" && <Notice code={state} />}{" "}
      {preview && (
        <div className="notice">
          <div>
            <strong>{t("JSON загружен", "JSON жүктелді")}</strong>
            <p>
              {preview.city} · {preview.venue} · {preview.category}
            </p>
            <p>{preview.description}</p>
          </div>
        </div>
      )}
    </details>
  );
}
