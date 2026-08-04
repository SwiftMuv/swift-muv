import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { customerDict } from "@/i18n/customer";
import { driverDict } from "@/i18n/driver";
import { bookingDict } from "@/i18n/booking";
import { authDict } from "@/i18n/auth";
import { coreDict } from "@/i18n/core";



type I18nState = {
  lang: string;
  currency: string;
  setLang: (v: string) => void;
  setCurrency: (v: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }) => string;
  formatPrice: (amount: number) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
};

export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-CA" },
  { code: "fr", label: "Français", locale: "fr-CA" },
  { code: "es", label: "Español", locale: "es-ES" },
  { code: "pt", label: "Português", locale: "pt-PT" },
  { code: "de", label: "Deutsch", locale: "de-DE" },
  { code: "it", label: "Italiano", locale: "it-IT" },
] as const;

export const CURRENCIES = [
  { code: "CAD", label: "CAD $" },
  { code: "USD", label: "USD $" },
  { code: "EUR", label: "EUR €" },
  { code: "GBP", label: "GBP £" },
  { code: "AUD", label: "AUD $" },
  { code: "NZD", label: "NZD $" },
  { code: "CHF", label: "CHF" },
  { code: "JPY", label: "JPY ¥" },
  { code: "CNY", label: "CNY ¥" },
  { code: "INR", label: "INR ₹" },
  { code: "BRL", label: "BRL R$" },
  { code: "MXN", label: "MXN $" },
  { code: "ZAR", label: "ZAR R" },
  { code: "AED", label: "AED د.إ" },
  { code: "NGN", label: "NGN ₦" },
] as const;

const SUPPORTED_LANG_CODES = new Set<string>(LANGUAGES.map((l) => l.code));
const SUPPORTED_CURRENCY_CODES = new Set<string>(CURRENCIES.map((c) => c.code));

// Approximate FX rates relative to CAD (base). Update as needed.
const RATES: Record<string, number> = {
  CAD: 1, USD: 0.73, EUR: 0.68, GBP: 0.58, AUD: 1.12, NZD: 1.22,
  CHF: 0.64, JPY: 114, CNY: 5.3, INR: 62, BRL: 4.0, MXN: 14,
  ZAR: 13.5, AED: 2.7, NGN: 1100,
};

const ZERO_DECIMAL = new Set(["JPY", "NGN"]);

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "nav.home": "Home", "nav.bookings": "Bookings", "nav.activities": "Activities", "nav.account": "Account", "nav.wallet": "Wallet", "nav.activity": "Activity",
    "common.loading": "Loading…", "common.noBookings": "No bookings yet.", "common.noBookingsShort": "No bookings", "common.from": "From:", "common.to": "To:", "common.cancel": "Cancel", "common.cancelling": "Cancelling…", "common.rebook": "Rebook", "common.total": "Total", "common.email": "Email", "common.customer": "Customer", "common.account": "Account", "common.aboutUs": "About Us", "common.signOut": "Sign out", "common.online": "Online", "common.offline": "Offline",
    "status.pending": "pending", "status.assigned": "assigned", "status.in_progress": "in progress", "status.completed": "completed", "status.cancelled": "cancelled", "status.available": "available",
    "dashboard.customer.title.home": "SwiftMuv", "dashboard.customer.title.bookings": "Book a Move", "dashboard.customer.title.activities": "Activities", "dashboard.customer.title.account": "Account",
    "customer.welcome": "Welcome back", "customer.heroTitle": "Move smarter with SwiftMuv", "customer.heroSubtitle": "Trusted by thousands of happy customers across the city.", "customer.happyCustomers": "Happy customers", "customer.averageRating": "4.9 ★ average", "customer.videosTitle": "Vans on the move", "customer.cancelProgress": "Move in progress — cancellation no longer available.", "customer.cancelBookingTitle": "Cancel booking?", "customer.cancelWithFee": "A driver has already accepted this job. Cancelling now will charge a {fee} fee.", "customer.cancelNoFee": "Are you sure you want to cancel this booking? No fee will apply.", "customer.keepBooking": "Keep booking", "customer.confirmCancellation": "Confirm cancellation", "customer.paymentConfirmed": "Payment confirmed — your move is being booked.", "customer.bookingCancelled": "Booking cancelled", "customer.cancelledFee": "Cancelled. {fee} fee applied.",
    "booking.estimatedTotal": "Estimated total", "booking.calculatingDistance": "calculating distance…", "booking.route": "Route", "booking.pickup": "Pickup", "booking.dropoff": "Drop-off", "booking.pickupPlaceholder": "Pickup address", "booking.dropoffPlaceholder": "Drop-off address", "booking.enterPickup": "Enter pickup address", "booking.enterDropoff": "Enter drop-off address", "booking.trip": "Trip", "booking.todayAsap": "Today, ASAP", "booking.selected": "Selected", "booking.recommended": "Recommended", "booking.inventory": "Inventory", "booking.item": "item", "booking.items": "items", "booking.additionalCrew": "Additional crew", "booking.optionalPerson": "Optional · {amount}/person", "booking.crewMembers": "Crew members", "booking.priceBreakdown": "Price breakdown", "booking.suvFlatRate": "SUV flat rate (local)", "booking.distance": "Distance", "booking.volume": "Volume", "booking.weight": "Weight", "booking.flatSuv": "Bags & luggage only · flat {flat} local{extra}", "booking.perKmExtra": " + {rate}/km", "booking.bookNow": "Book Now · {amount}", "booking.preparingCheckout": "Preparing checkout…", "booking.processing": "Processing…", "booking.paymentNote": "No booking is created until your payment is confirmed. Cancel anytime before paying.", "booking.secureCheckout": "Secure checkout", "booking.heldUntilDropoff": "Held until your driver arrives at drop-off", "booking.preparingPayment": "Preparing secure payment…", "booking.closeCheckout": "Close checkout", "booking.fillQuote": "Fill in addresses and select move size to see your quote", "booking.yourQuote": "Your Quote", "booking.distanceFee": "Distance fee", "booking.serviceFee": "Service fee", "booking.processingCheckout": "Processing checkout…",
    "driver.todayEarnings": "Today's Earnings", "driver.vsYesterday": "+12% vs yesterday", "driver.thisWeek": "This Week", "driver.completed": "Completed", "driver.rating": "Rating", "driver.offlineTitle": "You're currently offline", "driver.offlineSubtitle": "Go online to receive job requests", "driver.available": "Available", "driver.myActive": "My Active", "driver.noJobs": "No jobs available right now", "driver.noActiveJob": "No active job. Accept one to get started.", "driver.pickup": "Pickup:", "driver.dropoff": "Drop-off:", "driver.moveSize": "Move size:", "driver.acceptJob": "Accept Job", "driver.markArrived": "Mark as Arrived", "driver.markLoaded": "Mark as Loaded", "driver.completeTrip": "Complete Trip", "driver.arrivedPickup": "Arrived at Pickup", "driver.startTrip": "Start Trip (In Transit)", "driver.jobCompleted": "Job Completed!", "driver.earningsWallet": "Earnings added to your wallet", "driver.activeJob": "Active Job", "driver.enterCode": "Enter 4-digit Job Code", "driver.invalidCode": "Invalid code. Please try again.", "driver.finishCurrent": "Finish your current job first", "driver.jobAccepted": "Job accepted", "driver.jobCompletedToast": "Job completed! Earnings released.", "driver.newJob": "New job request available!",
    "wallet.availableBalance": "Available Balance", "wallet.pending": "{amount} pending (in-progress jobs)", "wallet.withdraw": "Withdraw", "wallet.linkBank": "Withdraw", "wallet.requestWithdrawal": "Request withdrawal to {bank}", "wallet.amount": "Amount", "wallet.pendingProcessing": "Pending — processed within 1-3 business days", "wallet.requestPayout": "Request payout", "wallet.withdrawals": "Withdrawals", "wallet.noWithdrawals": "No withdrawals yet", "wallet.withdrawal": "Withdrawal", "wallet.thisMonth": "This Month", "wallet.linkBankFirst": "Link a bank account first", "wallet.enterValidAmount": "Enter a valid amount", "wallet.onlyAvailable": "Only {amount} available", "wallet.withdrawRequested": "Withdrawal of {amount} requested", "wallet.withdrawFailed": "Withdraw failed", "driver.pendingEarnings": "Pending",
    "history.totalEarned": "Total Earned", "history.completedTrips": "Completed Trips", "history.loading": "Loading...", "history.noTrips": "No completed trips yet", "history.routeDetails": "Route details",
  },
  fr: {
    "nav.home": "Accueil", "nav.bookings": "Réservations", "nav.activities": "Activités", "nav.account": "Compte", "nav.wallet": "Portefeuille", "nav.activity": "Activité",
    "common.loading": "Chargement…", "common.noBookings": "Aucune réservation pour le moment.", "common.noBookingsShort": "Aucune réservation", "common.from": "De :", "common.to": "À :", "common.cancel": "Annuler", "common.cancelling": "Annulation…", "common.rebook": "Réserver à nouveau", "common.total": "Total", "common.email": "E-mail", "common.customer": "Client", "common.account": "Compte", "common.aboutUs": "À propos", "common.signOut": "Se déconnecter", "common.online": "En ligne", "common.offline": "Hors ligne",
    "status.pending": "en attente", "status.assigned": "attribué", "status.in_progress": "en cours", "status.completed": "terminé", "status.cancelled": "annulé", "status.available": "disponible",
    "dashboard.customer.title.home": "SwiftMuv", "dashboard.customer.title.bookings": "Réserver un déménagement", "dashboard.customer.title.activities": "Activités", "dashboard.customer.title.account": "Compte",
    "customer.welcome": "Bon retour", "customer.heroTitle": "Déménagez plus intelligemment avec SwiftMuv", "customer.heroSubtitle": "Des milliers de clients satisfaits nous font confiance dans toute la ville.", "customer.happyCustomers": "Clients satisfaits", "customer.averageRating": "4,9 ★ moyenne", "customer.videosTitle": "Vans en mouvement", "customer.cancelProgress": "Déménagement en cours — l’annulation n’est plus disponible.", "customer.cancelBookingTitle": "Annuler la réservation ?", "customer.cancelWithFee": "Un chauffeur a déjà accepté ce travail. L’annulation maintenant entraînera des frais de {fee}.", "customer.cancelNoFee": "Voulez-vous vraiment annuler cette réservation ? Aucun frais ne sera appliqué.", "customer.keepBooking": "Conserver", "customer.confirmCancellation": "Confirmer", "customer.paymentConfirmed": "Paiement confirmé — votre déménagement est en cours de réservation.", "customer.bookingCancelled": "Réservation annulée", "customer.cancelledFee": "Annulé. Des frais de {fee} ont été appliqués.",
    "booking.estimatedTotal": "Total estimé", "booking.calculatingDistance": "calcul de la distance…", "booking.route": "Itinéraire", "booking.pickup": "Ramassage", "booking.dropoff": "Livraison", "booking.pickupPlaceholder": "Adresse de ramassage", "booking.dropoffPlaceholder": "Adresse de livraison", "booking.enterPickup": "Entrez l’adresse de ramassage", "booking.enterDropoff": "Entrez l’adresse de livraison", "booking.trip": "Trajet", "booking.todayAsap": "Aujourd’hui, dès que possible", "booking.selected": "Sélectionné", "booking.recommended": "Recommandé", "booking.inventory": "Inventaire", "booking.item": "article", "booking.items": "articles", "booking.additionalCrew": "Équipe supplémentaire", "booking.optionalPerson": "Optionnel · {amount}/personne", "booking.crewMembers": "Membres de l’équipe", "booking.priceBreakdown": "Détail du prix", "booking.suvFlatRate": "Tarif forfaitaire SUV (local)", "booking.distance": "Distance", "booking.volume": "Volume", "booking.weight": "Poids", "booking.flatSuv": "Sacs et bagages uniquement · forfait local {flat}{extra}", "booking.perKmExtra": " + {rate}/km", "booking.bookNow": "Réserver · {amount}", "booking.preparingCheckout": "Préparation du paiement…", "booking.processing": "Traitement…", "booking.paymentNote": "Aucune réservation n’est créée avant la confirmation du paiement. Annulez à tout moment avant de payer.", "booking.secureCheckout": "Paiement sécurisé", "booking.heldUntilDropoff": "Conservé jusqu’à l’arrivée du chauffeur à destination", "booking.preparingPayment": "Préparation du paiement sécurisé…", "booking.closeCheckout": "Fermer le paiement", "booking.fillQuote": "Remplissez les adresses et sélectionnez la taille pour voir votre devis", "booking.yourQuote": "Votre devis", "booking.distanceFee": "Frais de distance", "booking.serviceFee": "Frais de service", "booking.processingCheckout": "Traitement du paiement…",
    "driver.todayEarnings": "Gains du jour", "driver.vsYesterday": "+12 % vs hier", "driver.thisWeek": "Cette semaine", "driver.completed": "Terminés", "driver.rating": "Note", "driver.offlineTitle": "Vous êtes actuellement hors ligne", "driver.offlineSubtitle": "Passez en ligne pour recevoir des demandes", "driver.available": "Disponibles", "driver.myActive": "Mon actif", "driver.noJobs": "Aucun travail disponible pour le moment", "driver.noActiveJob": "Aucun travail actif. Acceptez-en un pour commencer.", "driver.pickup": "Ramassage :", "driver.dropoff": "Livraison :", "driver.moveSize": "Taille :", "driver.acceptJob": "Accepter", "driver.markArrived": "Marquer arrivé", "driver.markLoaded": "Marquer chargé", "driver.completeTrip": "Terminer", "driver.arrivedPickup": "Arrivé au ramassage", "driver.startTrip": "Commencer le trajet", "driver.jobCompleted": "Travail terminé !", "driver.earningsWallet": "Gains ajoutés au portefeuille", "driver.activeJob": "Travail actif", "driver.enterCode": "Entrez le code à 4 chiffres", "driver.invalidCode": "Code invalide. Réessayez.", "driver.finishCurrent": "Terminez d’abord votre travail actuel", "driver.jobAccepted": "Travail accepté", "driver.jobCompletedToast": "Travail terminé ! Gains libérés.", "driver.newJob": "Nouvelle demande disponible !",
    "wallet.availableBalance": "Solde disponible", "wallet.pending": "{amount} en attente (travaux en cours)", "wallet.withdraw": "Retirer", "wallet.linkBank": "Retirer", "wallet.requestWithdrawal": "Demander un retrait vers {bank}", "wallet.amount": "Montant", "wallet.pendingProcessing": "En attente — traité sous 1 à 3 jours ouvrables", "wallet.requestPayout": "Demander le paiement", "wallet.withdrawals": "Retraits", "wallet.noWithdrawals": "Aucun retrait", "wallet.withdrawal": "Retrait", "wallet.thisMonth": "Ce mois-ci", "wallet.linkBankFirst": "Liez d’abord un compte bancaire", "wallet.enterValidAmount": "Entrez un montant valide", "wallet.onlyAvailable": "Seulement {amount} disponible", "wallet.withdrawRequested": "Retrait de {amount} demandé", "wallet.withdrawFailed": "Échec du retrait", "driver.pendingEarnings": "En attente",
    "history.totalEarned": "Total gagné", "history.completedTrips": "Trajets terminés", "history.loading": "Chargement...", "history.noTrips": "Aucun trajet terminé", "history.routeDetails": "Détails de l’itinéraire",
  },
};

const COPY_LANGS = ["es", "pt", "de", "it"];
for (const code of COPY_LANGS) {
  TRANSLATIONS[code] = { ...TRANSLATIONS.en, ...(coreDict[code] ?? {}) };
}

// Merge feature-area dictionaries. Languages without their own entries fall back to English.
const ALL_LANGS = LANGUAGES.map((l) => l.code);
for (const dict of [customerDict, driverDict, bookingDict, authDict]) {
  const en = dict.en ?? {};
  for (const code of ALL_LANGS) {
    TRANSLATIONS[code] = { ...TRANSLATIONS[code], ...en, ...(dict[code] ?? {}) };
  }
}


const localeFor = (lang: string) => LANGUAGES.find((l) => l.code === lang)?.locale ?? "en-CA";
const cleanLang = (value: string | null | undefined) => (value && SUPPORTED_LANG_CODES.has(value) ? value : "en");
const cleanCurrency = (value: string | null | undefined) => (value && SUPPORTED_CURRENCY_CODES.has(value) ? value : "CAD");

const readStorage = (key: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) || fallback;
};

const I18nContext = createContext<I18nState | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();
  const [lang, setLangState] = useState<string>(() => cleanLang(readStorage("app.lang", "en")));
  const [currency, setCurrencyState] = useState<string>(() => cleanCurrency(readStorage("app.currency", "CAD")));
  const loadedProfileRef = useRef<string | null>(null);

  const profileTable = role === "driver" ? "driver_profiles" : role === "customer" ? "customer_profiles" : null;

  useEffect(() => {
    localStorage.setItem("app.lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("app.currency", currency);
  }, [currency]);

  useEffect(() => {
    if (!user || !profileTable) return;
    const key = `${profileTable}:${user.id}`;
    let cancelled = false;

    (async () => {
      const { data } = await (supabase as any)
        .from(profileTable)
        .select("preferred_language, preferred_currency")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      loadedProfileRef.current = key;
      const savedLang = cleanLang(data?.preferred_language);
      const savedCurrency = cleanCurrency(data?.preferred_currency);
      setLangState(savedLang);
      setCurrencyState(savedCurrency);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profileTable]);

  useEffect(() => {
    if (!user || !profileTable) return;
    if (loadedProfileRef.current !== `${profileTable}:${user.id}`) return;

    const timeout = window.setTimeout(() => {
      (supabase as any)
        .from(profileTable)
        .update({ preferred_language: lang, preferred_currency: currency })
        .eq("user_id", user.id)
        .then(({ error }: { error: Error | null }) => {
          if (error) console.error("Unable to save language/currency preference", error);
        });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [lang, currency, user, profileTable]);

  const setLang = (v: string) => setLangState(cleanLang(v));
  const setCurrency = (v: string) => setCurrencyState(cleanCurrency(v));

  const locale = localeFor(lang);

  const t = useMemo(
    () => (key: string, vars: Record<string, string | number> = {}) => {
      const template = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
        template,
      );
    },
    [lang],
  );

  const formatCurrency = (amountCad: number, options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {}) => {
    const rate = RATES[currency] ?? 1;
    const converted = Number(amountCad || 0) * rate;
    const defaultDigits = ZERO_DECIMAL.has(currency) ? 0 : 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options.minimumFractionDigits ?? defaultDigits,
      maximumFractionDigits: options.maximumFractionDigits ?? defaultDigits,
    }).format(converted);
  };

  const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const date = typeof value === "string" ? new Date(value) : value;
    return new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  return (
    <I18nContext.Provider value={{ lang, currency, setLang, setCurrency, t, formatCurrency, formatPrice: formatCurrency, formatDate }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
