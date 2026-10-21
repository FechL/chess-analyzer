import { useEffect, useRef, useState } from "react";
import { LocalEngine } from "../lib/engine";
export function useEngine(variant: "lite" | "full" = "lite") {
  const engine = useRef<LocalEngine | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    const instance = new LocalEngine(variant);
    engine.current = instance;
    instance.ready
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch((e) => {
        if (active) {
          setStatus("error");
          setError(e.message);
        }
      });
    return () => {
      active = false;
      instance.destroy();
      if (engine.current === instance) engine.current = null;
    };
  }, [variant]);
  return { engine, status, error };
}
