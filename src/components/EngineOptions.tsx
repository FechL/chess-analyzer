import { useId } from "react";
import { useI18n } from "../lib/i18n";
import type { Settings } from "../App";

export type EngineOptionsValue = Pick<
  Settings,
  | "engine"
  | "liveEngine"
  | "engineDepth"
  | "analysisMs"
  | "showArrows"
  | "showPieceAnnotation"
  | "multiPV"
>;
export default function EngineOptions({
  value,
  onChange,
  shortcuts = false,
}: {
  value: EngineOptionsValue;
  onChange: (next: EngineOptionsValue) => void;
  shortcuts?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="engine-options">
      <div className="settings-section">
        <label htmlFor={`${id}-engine`}>{t("Pilih engine")}</label>
        <select
          id={`${id}-engine`}
          value={value.engine}
          onChange={(e) => {
            onChange({
              ...value,
              engine: e.target.value as EngineOptionsValue["engine"],
            });
          }}
        >
          <option value="lite">{t("Stockfish 19 Lite")}</option>
          <option value="full">{t("Stockfish 19 Full")}</option>
        </select>
      </div>
      <div className="settings-section">
        <label className="board-sound-setting">
          <input
            type="checkbox"
            role="switch"
            checked={value.liveEngine}
            aria-keyshortcuts={shortcuts ? "E" : undefined}
            title={t("Live engine") + (shortcuts ? " (E)" : "")}
            onChange={(e) =>
              onChange({
                ...value,
                liveEngine: e.target.checked,
              })
            }
          />
          {t("Live engine")}
        </label>
      </div>
      <div className="settings-section">
        <label htmlFor={`${id}-depth`}>{t("Batas depth")}</label>
        <select
          id={`${id}-depth`}
          value={value.engineDepth}
          onChange={(e) =>
            onChange({
              ...value,
              engineDepth: Number(e.target.value),
            })
          }
        >
          <option value={0}>{t("Otomatis · mengikuti waktu")}</option>
          {t(
            [8, 12, 16, 20, 24, 30].map((depth) => (
              <option key={depth} value={depth}>
                {t("Depth ")}
                {t(depth)}
              </option>
            )),
          )}
        </select>
      </div>
      <div className="settings-section">
        <label htmlFor={`${id}-time`}>
          {t("Waktu analisis")}
          {t(" ")}
          <strong>{t(`${value.analysisMs / 1000} detik`)}</strong>
        </label>
        <input
          id={`${id}-time`}
          type="range"
          min="200"
          max="10000"
          step="100"
          value={value.analysisMs}
          onChange={(e) =>
            onChange({
              ...value,
              analysisMs: Number(e.target.value),
            })
          }
        />
      </div>
      <div className="settings-section">
        <label className="board-sound-setting">
          <input
            type="checkbox"
            role="switch"
            checked={value.showArrows}
            aria-keyshortcuts={shortcuts ? "A" : undefined}
            title={t("Tampilkan panah engine") + (shortcuts ? " (A)" : "")}
            onChange={(e) =>
              onChange({
                ...value,
                showArrows: e.target.checked,
              })
            }
          />
          {t("Tampilkan panah engine")}
        </label>
      </div>
      <div className="settings-section">
        <label className="board-sound-setting">
          <input
            type="checkbox"
            role="switch"
            checked={value.showPieceAnnotation}
            aria-keyshortcuts={shortcuts ? "C" : undefined}
            title={
              t("Tampilkan kategori pada buah") + (shortcuts ? " (C)" : "")
            }
            onChange={(e) =>
              onChange({
                ...value,
                showPieceAnnotation: e.target.checked,
              })
            }
          />
          {t("Tampilkan kategori pada buah")}
        </label>
      </div>
      <div className="settings-section">
        <label htmlFor={`${id}-variations`}>{t("Jumlah variasi")}</label>
        <select
          id={`${id}-variations`}
          value={value.multiPV}
          onChange={(e) =>
            onChange({
              ...value,
              multiPV: Number(e.target.value),
            })
          }
        >
          {t(
            [1, 2, 3].map((count) => (
              <option key={count} value={count}>
                {t(`${count} variasi`)}
              </option>
            )),
          )}
        </select>
      </div>
    </div>
  );
}
