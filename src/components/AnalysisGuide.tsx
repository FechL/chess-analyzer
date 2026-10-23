import { CircleHelp } from "lucide-react";
import { useI18n } from "../lib/i18n";
import {
  DashboardPopover,
  DashboardPopoverTrigger,
  DashboardPopoverContent,
} from "./block/dashboard-shell";

export default function AnalysisGuide({
  accuracy = false,
  header = false,
}: {
  accuracy?: boolean;
  header?: boolean;
}) {
  const { t } = useI18n();
  return (
    <DashboardPopover>
      <DashboardPopoverTrigger asChild>
        <button
          className={
            accuracy ? undefined : `icon-button${header ? " header-help" : ""}`
          }
          aria-label={t(
            accuracy
              ? "Metode akurasi"
              : header
                ? "Buka panduan"
                : "Tentang analisis",
          )}
          title={t(
            accuracy
              ? "Metode akurasi"
              : header
                ? "Buka panduan"
                : "Tentang analisis",
          )}
        >
          <CircleHelp
            size={accuracy ? 13 : header ? 18 : 15}
            aria-hidden="true"
          />
        </button>
      </DashboardPopoverTrigger>
      <DashboardPopoverContent
        className="shortcut-help-popover analysis-guide-popover"
        align="end"
        side="bottom"
        aria-label={t("Memahami hasil analisis")}
      >
        <strong>{t("Memahami hasil analisis")}</strong>
        <div className="analysis-guide-copy">
          <p>
            {t(
              "Evaluasi positif menguntungkan putih; negatif menguntungkan hitam. M menunjukkan jarak menuju skakmat menurut engine.",
            )}
          </p>
          <p>
            {t(
              "Akurasi adalah estimasi aplikasi berdasarkan perubahan peluang menang dari evaluasi Stockfish, dengan kurva publik yang juga digunakan Lichess. Label langkah memakai ambang aplikasi sendiri dan tidak sama dengan skor resmi platform lain.",
            )}
          </p>
          <p>
            {t(
              "Peluang terlewat menandai kesempatan taktis berupa tangkapan atau skak yang diabaikan: keunggulan minimal +2 turun di bawah +1, atau posisi sekitar seimbang (−0,5 sampai +0,5) turun ke −2 atau lebih buruk, dari sudut pemain yang melangkah. Kedua evaluasi memerlukan depth minimal 12. Skor akurasi tetap dihitung dari penurunan peluang menang.",
            )}
          </p>
          <p>
            {t(
              "Brilian memakai aturan lokal: pilihan utama engine pada depth minimal 12 yang mengorbankan buah, tetap mempertahankan posisi, dan tidak langsung mendapatkan kembali material dalam variasi utama. Ini perkiraan aplikasi, bukan label resmi platform lain.",
            )}
          </p>
          <p>
            {t(
              "Book Move dikenali dari posisi dan langkah dalam database opening Lichess yang tersimpan lokal. Transposisi ikut dikenali. Langkah di luar database belum tentu buruk. Label ini terpisah dari skor akurasi Stockfish.",
            )}
          </p>
          <p>
            {t(
              "Ulasan cepat memakai 350 ms per posisi. Posisi rumit atau pengorbanan mungkin membutuhkan pencarian lebih lama. Buka tab Opsi dan naikkan waktu analisis untuk memeriksanya.",
            )}
          </p>
          <p>
            {t(
              "Stockfish lite memakai jaringan yang lebih kecil daripada versi penuh. Catatan pelatih memakai aturan dan hasil engine, tanpa LLM atau API eksternal.",
            )}
          </p>
          <a
            href="https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html"
            target="_blank"
            rel="noreferrer"
          >
            {t("Dokumentasi evaluasi Stockfish ↗")}
          </a>
        </div>
      </DashboardPopoverContent>
    </DashboardPopover>
  );
}
