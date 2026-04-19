import { useMemo, useState } from "react";

type MascotState = "idle" | "listening" | "talking" | "thinking";

interface Props {
  mode?: "floating" | "inline";
  active?: boolean;
  loading?: boolean;
  onClick: () => void;
  label?: string;
}

const floatingMascotSources: Record<MascotState, string[]> = {
  idle: ["/mascot/mascot-idle.png", "/mascot/images/servo_base_image.png"],
  listening: [
    "/mascot/mascot-listening.png",
    "/mascot/mascot-idle.png",
    "/mascot/images/servo_base_image.png",
  ],
  talking: [
    "/mascot/mascot-talking.png",
    "/mascot/mascot-listening.png",
    "/mascot/images/servo_base_image.png",
  ],
  thinking: [
    "/mascot/mascot-thinking.png",
    "/mascot/mascot-idle.png",
    "/mascot/images/servo_base_image.png",
  ],
};

const inlineMascotSources: Record<MascotState, string[]> = {
  idle: [
    "/mascot/images/servo_suggestion.png",
    "/mascot/images/servo_base_image.png",
  ],
  listening: [
    "/mascot/images/servo_suggestion.png",
    "/mascot/images/servo_base_image.png",
  ],
  talking: [
    "/mascot/images/servo_suggestion.png",
    "/mascot/images/servo_base_image.png",
  ],
  thinking: [
    "/mascot/images/servo_suggestion.png",
    "/mascot/images/servo_base_image.png",
  ],
};

export default function MascotAssistantTrigger({
  mode = "floating",
  active = false,
  loading = false,
  onClick,
  label = "Talk to Servo assistant",
}: Props) {
  const state: MascotState = loading
    ? "thinking"
    : active
      ? "listening"
      : "idle";
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const candidates = useMemo(
    () =>
      mode === "inline"
        ? inlineMascotSources[state]
        : floatingMascotSources[state],
    [mode, state],
  );

  const imageSrc = candidates[Math.min(fallbackIndex, candidates.length - 1)];
  const mascotFrame =
    mode === "floating"
      ? "pointer-events-none absolute bottom-0 left-0 flex h-[calc(7rem*1.65)] w-28 items-end justify-center overflow-visible"
      : "inline-flex h-12 w-12 items-center justify-center";
  const mascotImgBox =
    mode === "floating" ? "h-28 w-28 shrink-0" : "h-full w-full";
  const mascotScale = mode === "floating" ? "scale-[1.65]" : "scale-[1.05]";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        mode === "floating"
          ? "group fixed bottom-24 left-3 z-30 h-28 w-28 overflow-visible focus:outline-none"
          : "group w-full rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2 text-left transition-colors hover:bg-emerald-50 focus:outline-none"
      }
    >
      <span
        className={
          mode === "floating"
            ? "relative block h-full w-full"
            : "flex items-center justify-between gap-2 text-right"
        }
      >
        {mode === "inline" && (
          <span className="block text-[11px] text-slate-600">
            {active
              ? "Continue your chat with Servo"
              : "Get suggestions from Servo for this order"}
          </span>
        )}
        <span
          className={`relative transition ${
            active
              ? "drop-shadow-[0_0_14px_rgba(16,185,129,0.45)]"
              : "drop-shadow-md"
          } ${mascotFrame}`}
        >
          <img
            src={imageSrc}
            alt=""
            className={`${mascotImgBox} object-contain origin-bottom transition-transform ${mascotScale}`}
            onError={() => {
              setFallbackIndex((prev) =>
                Math.min(prev + 1, candidates.length - 1),
              );
            }}
          />
        </span>
      </span>
    </button>
  );
}
