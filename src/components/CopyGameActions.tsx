import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { copyText } from "../lib/clipboard";
import { useI18n } from "../lib/i18n";

type CopyGameActionsProps = {
  fen: string;
  getPgn: () => string;
  className?: string;
};

export default function CopyGameActions({
  fen,
  getPgn,
  className = "",
}: CopyGameActionsProps) {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function copy(kind: "FEN" | "PGN") {
    try {
      await copyText(kind === "FEN" ? fen : getPgn());
      setFeedback(kind === "FEN" ? "FEN disalin" : "PGN disalin");
    } catch {
      setFeedback("Gagal menyalin ke clipboard");
    }
  }

  return (
    <>
      <div
        className={`export-actions board-export-actions analysis-export-actions ${className}`.trim()}
      >
        <button className="text-button" onClick={() => void copy("FEN")}>
          {t("Salin FEN")} <Copy size={13} aria-hidden="true" />
        </button>
        <button className="text-button" onClick={() => void copy("PGN")}>
          {t("Salin PGN")} <Copy size={13} aria-hidden="true" />
        </button>
      </div>
      {feedback && (
        <div
          className="toast keyboard-toggle-toast"
          role="status"
          aria-live="polite"
        >
          {t(feedback)}
        </div>
      )}
    </>
  );
}
