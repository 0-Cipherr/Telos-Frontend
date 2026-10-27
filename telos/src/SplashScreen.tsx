import { useEffect, useState } from "react";
import { lockBodyScroll } from "./utils/scrollLock";
import "./splash.css";

type Phase = "in" | "out" | "done";

/**
 * Lightweight first-load splash. It overlays the app, holds the animated
 * pirate-flag mark for a beat, then fades away to reveal the page.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    const releaseScroll = lockBodyScroll();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hold = reducedMotion ? 450 : 1_450;
    const exit = reducedMotion ? 200 : 480;

    const fadeTimer = window.setTimeout(() => setPhase("out"), hold);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      // The component stays mounted while returning null, so release the
      // scroll lock here rather than waiting for unmount.
      releaseScroll();
    }, hold + exit);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      releaseScroll();
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`splash-screen${phase === "out" ? " is-out" : ""}`}
      role="status"
      aria-label="Loading Telos"
    >
      <span className="splash-halo" aria-hidden="true" />
      <span className="splash-flag" aria-hidden="true">
        🏴‍☠️
      </span>
      <span className="splash-bar" aria-hidden="true">
        <span />
      </span>
    </div>
  );
}
