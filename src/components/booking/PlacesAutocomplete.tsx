/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (description: string) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  placeId: string;
  text: string;
}

export const PlacesAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: Props) => {
  const { ready } = useGoogleMaps();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready || !value || value.length < 3) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const placesLib = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: sessionTokenRef.current,
        });
        const list: Suggestion[] = (raw ?? [])
          .map((s) => {
            const pred = s.placePrediction;
            if (!pred) return null;
            return {
              placeId: pred.placeId,
              text: pred.text?.toString?.() ?? "",
            };
          })
          .filter(Boolean) as Suggestion[];
        setSuggestions(list);
      } catch (e) {
        console.warn("Places autocomplete failed", e);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, ready]);

  const handlePick = (s: Suggestion) => {
    onChange(s.text);
    onSelect?.(s.text);
    setSuggestions([]);
    setOpen(false);
    sessionTokenRef.current = null;
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
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(s)}
                className="block w-full truncate px-3 py-2 text-left text-sm text-black hover:bg-slate-100"
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
