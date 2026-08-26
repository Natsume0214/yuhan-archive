"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LoadingIntroProps = {
  ready?: boolean;
  onComplete: () => void;
  onBurstStart?: () => void;
};

const LOADING_ASSETS = [
  "/loading/photo-pink.png",
  "/loading/photo-silver.png",
  "/loading/photo-blue.png",
  "/loading/glyph-device.png",
  "/loading/glyph-o.png",
  "/loading/glyph-wheel.png",
  "/loading/shape-a.png",
  "/loading/shape-d.png",
  "/loading/shape-vector.png",
];

// These are absolute offsets rather than per-frame delays. Each image enters
// on its own beat, then remains visible while the next slot changes. This
// preserves a 600ms full-group hold without serialising every asset.
const PHASE_TIMINGS = [
  120, 260, 420,
  820, 900, 980,
  1580, 1660, 1740,
  2340, 2420, 2500,
  3100, 3705,
];

type SlotAsset = {
  src: string;
  className: string;
};

type MarkerPattern = readonly [boolean, boolean, boolean, boolean];

type MarkerFrame = {
  active: MarkerPattern;
};

type MarkerSelection = {
  order: number[];
  count: number;
};

const EMPTY_MARKER_PATTERN: MarkerPattern = [false, false, false, false];
const IMAGE_GROUP_START_PHASES = [3, 6, 9] as const;
const IMAGE_GROUP_STARTS = IMAGE_GROUP_START_PHASES.map((phaseIndex) => PHASE_TIMINGS[phaseIndex]);
const IMAGE_GROUP_INTERVAL = 80;
// Leave one clear beat after each group reset. The markers then follow the
// same 80ms rhythm as the three image slots, with a slight visual lag.
const MARKER_REVEAL_OFFSET = IMAGE_GROUP_INTERVAL + 20;

const createMarkerSelection = (): MarkerSelection => {
  const markerOrder = [0, 1, 2, 3];
  for (let index = markerOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [markerOrder[index], markerOrder[swapIndex]] = [markerOrder[swapIndex], markerOrder[index]];
  }

  return {
    order: markerOrder,
    count: 2 + Math.floor(Math.random() * 3),
  };
};

const LOADING_MOTION_CHARS = [
  { char: "{", compactX: "-2.65em", wideX: "-5.15em", cutX: "-3.65em" },
  { char: "L", compactX: "-1.88em", wideX: "-3.28em", cutX: "-2.35em" },
  { char: "O", compactX: "-1.12em", wideX: "-2.25em", cutX: "-1.55em" },
  { char: "A", compactX: "-.38em", wideX: "-1.16em", cutX: "-.75em" },
  { char: "D", compactX: ".36em", wideX: "-.08em", cutX: "-.06em" },
  { char: "I", compactX: ".88em", wideX: ".84em", cutX: ".62em" },
  { char: "N", compactX: "1.34em", wideX: "1.88em", cutX: "1.3em" },
  { char: "G", compactX: "2.06em", wideX: "3.02em", cutX: "2.15em" },
  { char: "}", compactX: "2.8em", wideX: "5.15em", cutX: "3.65em" },
];

export default function LoadingIntro({ ready = true, onComplete, onBurstStart }: LoadingIntroProps) {
  const [phase, setPhase] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [markerFrame, setMarkerFrame] = useState<MarkerFrame>({
    active: [false, false, false, false],
  });
  const completionStarted = useRef(false);
  const burstStarted = useRef(false);

  const startBurst = useCallback(() => {
    if (burstStarted.current) return;
    burstStarted.current = true;
    onBurstStart?.();
  }, [onBurstStart]);

  const complete = useCallback(() => {
    if (completionStarted.current) return;
    completionStarted.current = true;
    setExiting(true);
    window.setTimeout(() => {
      document.body.classList.remove("loading-active");
      onComplete();
    }, 40);
  }, [onComplete]);

  useEffect(() => {
    document.body.classList.add("loading-active");
    window.scrollTo({ top: 0, behavior: "auto" });

    let markerLoopActive = true;
    const markerTimers: number[] = [];
    const scheduleMarker = (delay: number, update: () => void) => {
      markerTimers.push(window.setTimeout(() => {
        if (markerLoopActive) update();
      }, delay));
    };

    IMAGE_GROUP_STARTS.forEach((groupStart) => {
      const selection = createMarkerSelection();

      // The image group and the marker group share the same start clock.
      // Clearing first prevents any marker from reading as a persistent point.
      scheduleMarker(groupStart, () => setMarkerFrame({ active: EMPTY_MARKER_PATTERN }));

      selection.order.slice(0, selection.count).forEach((markerIndex, index) => {
        scheduleMarker(
          groupStart + MARKER_REVEAL_OFFSET + index * IMAGE_GROUP_INTERVAL,
          () => setMarkerFrame((current) => {
            const next = [...current.active] as [boolean, boolean, boolean, boolean];
            next[markerIndex] = true;
            return { active: next };
          }),
        );
      });
    });

    const timers = PHASE_TIMINGS.map((delay, index) => (
      window.setTimeout(() => setPhase(index + 1), delay)
    ));

    const preloads = LOADING_ASSETS.map((source) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = source;
    }));
    Promise.all(preloads).then(() => setAssetsReady(true));

    return () => {
      markerLoopActive = false;
      markerTimers.forEach((timer) => window.clearTimeout(timer));
      timers.forEach((timer) => window.clearTimeout(timer));
      document.body.classList.remove("loading-active");
    };
  }, []);

  useEffect(() => {
    if (phase < 14 || completionStarted.current) return;
    if (ready && assetsReady) {
      startBurst();
      complete();
      return;
    }

    // The animation remains quick even if a non-critical asset is slow. The
    // metal-letter scene is already being prepared underneath the overlay.
    const fallback = window.setTimeout(() => {
      startBurst();
      complete();
    }, 360);
    return () => window.clearTimeout(fallback);
  }, [assetsReady, complete, phase, ready, startBurst]);

  const showImageSlots = phase >= 4 && phase < 13;
  const showMotion = phase >= 13;

  const slotAssets: Array<SlotAsset | null> = [
    phase >= 10
      ? { src: "/loading/shape-a.png", className: "loading-intro__slot--shape-a" }
      : phase >= 7
        ? { src: "/loading/glyph-device.png", className: "loading-intro__slot--device" }
        : phase >= 4
          ? { src: "/loading/photo-pink.png", className: "loading-intro__slot--pink" }
          : null,
    phase >= 11
      ? { src: "/loading/shape-vector.png", className: "loading-intro__slot--shape-vector" }
      : phase >= 8
        ? { src: "/loading/glyph-o.png", className: "loading-intro__slot--o" }
        : phase >= 5
          ? { src: "/loading/photo-silver.png", className: "loading-intro__slot--silver" }
          : null,
    phase >= 12
      ? { src: "/loading/shape-d.png", className: "loading-intro__slot--shape-d" }
      : phase >= 9
        ? { src: "/loading/glyph-wheel.png", className: "loading-intro__slot--wheel" }
        : phase >= 6
          ? { src: "/loading/photo-blue.png", className: "loading-intro__slot--blue" }
          : null,
  ];

  return (
    <div
      className={`loading-intro${exiting ? " is-exiting" : ""}`}
      data-phase={phase}
      role="status"
      aria-label="Loading"
      aria-hidden={exiting}
    >
      <div className={`loading-intro__markers${phase >= 1 ? " is-visible" : ""}`} aria-hidden="true">
        {markerFrame.active.map((active, index) => (
          <i
            key={index}
            className={active ? "is-active" : undefined}
          />
        ))}
      </div>

      {phase >= 4 && phase <= 12 ? (
        <div className="loading-intro__arrows" aria-hidden="true">
          <span>←</span>
          <span>→</span>
        </div>
      ) : null}

      <div className="loading-intro__stage">
        {phase === 0 ? (
          <span className="loading-intro__seed">&#123;</span>
        ) : showMotion ? (
            <div className="loading-intro__motion-word" aria-hidden="true">
              {LOADING_MOTION_CHARS.map(({ char, compactX, wideX, cutX }, index) => (
                <span
                  key={`${char}-${index}`}
                  className={char === "{" || char === "}" ? "loading-intro__motion-char--brace" : undefined}
                  style={{
                    "--loading-compact-x": compactX,
                    "--loading-wide-x": wideX,
                    "--loading-cut-x": cutX,
                  } as React.CSSProperties}
                >
                  {char}
                </span>
              ))}
            </div>
          ) : (
            <div className="loading-intro__line">
              <span className="loading-intro__brace">&#123;</span>
              <div className="loading-intro__content">
                {phase === 1 ? <span>LOAD</span> : null}
                {phase === 2 || phase === 3 ? <span>LOADING</span> : null}

                {showImageSlots ? (
                  <>
                    <span>LO</span>
                    {slotAssets.map((asset, index) => asset ? (
                      <span
                        key={`${index}-${asset.src}`}
                        className={`loading-intro__slot ${asset.className}`}
                      >
                        <img src={asset.src} alt="" />
                      </span>
                    ) : null)}
                    <span>NG</span>
                  </>
                ) : null}
              </div>
              <span className="loading-intro__brace">&#125;</span>
            </div>
          )}
      </div>
    </div>
  );
}
