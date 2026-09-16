import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (description: string) => void;
  placeholder?: string;
  className?: string;
  /** Optional bias so nearby addresses rank first. */
  near?: { lat: number; lng: number } | null;
}

interface Suggestion {
  placeId: string;
  text: string;
  secondary?: string;
}

/**
 * Address suggestions come from the `places-autocomplete` edge function.
 * The browser Maps key is app-restricted, so calling Google directly from the
 * page is rejected — the backend key handles it instead.
 */
export const PlacesAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  near,
}: Props) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const lastQueryRef = useRef("");

  useEffect(() => {
    const query = value?.trim() ?? "";
    if (query.length < 3 || query === lastQueryRef.current) {
      if (query.length < 3) setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setSuggestions([]);
          setErrorText("Please sign in again to search addresses.");
          return;
        }
        const { data, error } = await supabase.functions.invoke("places-autocomplete", {
          body: { input: query, lat: near?.lat, lng: near?.lng },
        });
        if (error) throw error;
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setErrorText(
          list.length === 0
            ? data?.error
              ? `Address lookup unavailable (${data.error})`
              : null
            : null,
        );
      } catch (e) {
        console.warn("Places autocomplete failed", e);
        setSuggestions([]);
        setErrorText(
          `Address lookup failed: ${e instanceof Error ? e.message : "network error"}`,
        );
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, near?.lat, near?.lng]);

  const handlePick = (s: Suggestion) => {
    lastQueryRef.current = s.text;
    onChange(s.text);
    onSelect?.(s.text);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-popover-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.placeId}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(s)}
                className="block w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <span className="block truncate font-medium">{s.text}</span>
                {s.secondary && (
                  <span className="block truncate text-xs opacity-70">{s.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
