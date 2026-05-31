import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type I18nState = {
  lang: string;
  currency: string;
  setLang: (v: string) => void;
  setCurrency: (v: string) => void;
  formatPrice: (amount: number) => string;
};

// Approximate FX rates relative to CAD (base). Update as needed.
const RATES: Record<string, number> = {
  CAD: 1, USD: 0.73, EUR: 0.68, GBP: 0.58, AUD: 1.12, NZD: 1.22,
  CHF: 0.64, JPY: 114, CNY: 5.3, INR: 62, BRL: 4.0, MXN: 14,
  ZAR: 13.5, AED: 2.7, NGN: 1100,
};

const SYMBOLS: Record<string, string> = {
  CAD: "CA$", USD: "$", EUR: "€", GBP: "£", AUD: "A$", NZD: "NZ$",
  CHF: "CHF ", JPY: "¥", CNY: "¥", INR: "₹", BRL: "R$", MXN: "MX$",
  ZAR: "R", AED: "د.إ ", NGN: "₦",
};

const I18nContext = createContext<I18nState | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<string>(
    () => localStorage.getItem("app.lang") || "en"
  );
  const [currency, setCurrencyState] = useState<string>(
    () => localStorage.getItem("app.currency") || "CAD"
  );

  useEffect(() => {
    localStorage.setItem("app.lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("app.currency", currency);
  }, [currency]);

  const setLang = (v: string) => setLangState(v);
  const setCurrency = (v: string) => setCurrencyState(v);

  const formatPrice = (amountCad: number) => {
    const rate = RATES[currency] ?? 1;
    const converted = amountCad * rate;
    const sym = SYMBOLS[currency] ?? "";
    const fractionDigits = ["JPY", "NGN"].includes(currency) ? 0 : 2;
    return `${sym}${converted.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  };

  return (
    <I18nContext.Provider value={{ lang, currency, setLang, setCurrency, formatPrice }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
