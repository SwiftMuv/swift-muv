import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spoken turn-style guidance for the driver's active trip.
 * Uses the device speech synthesizer (works in the Android WebView too).
 * Announces status changes and distance milestones to the drop-off.
 */
export function useVoiceGuidance() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const lastSpokenRef = useRef<string | null>(null);
  const lastMilestoneRef = useRef<number | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && supported) window.speechSynthesis.cancel();
  }, [enabled, supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabledRef.current) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.pitch = 1;
        u.volume = 1;
        window.speechSynthesis.speak(u);
      } catch {
        /* speech unavailable — ignore */
      }
    },
    [supported],
  );

  /** Announce a trip status change (deduped). */
  const announceStatus = useCallback(
    (key: string, text: string) => {
      if (lastSpokenRef.current === key) return;
      lastSpokenRef.current = key;
      lastMilestoneRef.current = null;
      speak(text);
    },
    [speak],
  );

  /** Announce distance milestones to the drop-off: 500m, 200m, 100m, 50m, arrived. */
  const announceDistance = useCallback(
    (meters: number) => {
      const milestones = [500, 200, 100, 50];
      for (const m of milestones) {
        if (meters <= m && (lastMilestoneRef.current == null || lastMilestoneRef.current > m)) {
          lastMilestoneRef.current = m;
          speak(`${m} meters to drop-off`);
          return;
        }
      }
      if (meters <= 20 && lastMilestoneRef.current !== 20) {
        lastMilestoneRef.current = 20;
        speak("You have arrived at the drop-off. Trip complete.");
      }
    },
    [speak],
  );

  return { supported, enabled, setEnabled, speak, announceStatus, announceDistance };
}
