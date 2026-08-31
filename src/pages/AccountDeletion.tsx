import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/swiftmuv-logo.png";

const sections = [
  {
    title: "1. How to Request Account Deletion",
    body: "You can request deletion of your SwiftMuv account at any time by emailing support@swiftmuv.com from the email address registered to your account, with the subject line \"Account Deletion\". We may ask you to verify your identity before processing the request to protect your account.",
  },
  {
    title: "2. What Gets Deleted",
    body: "Once your deletion request is processed, your profile information, saved addresses, booking history, payment method references, and (for drivers) vehicle and onboarding details are permanently removed from our active systems.",
  },
  {
    title: "3. What May Be Retained",
    body: "Certain records must be retained for a limited period to comply with legal, tax, and financial reporting obligations — for example, completed trip receipts, payment records, and dispute history. These records are kept only as long as legally required and are not used for any other purpose.",
  },
  {
    title: "4. Active Bookings and Outstanding Balances",
    body: "Accounts with an active or in-progress booking cannot be deleted until the booking is completed or cancelled. Any outstanding payouts (for drivers) must be settled before the account can be closed.",
  },
  {
    title: "5. Processing Time",
    body: "Deletion requests are processed within 30 days of verification. You will receive a confirmation email once your account has been permanently deleted. Deleting the app from your device alone does not delete your account or data.",
  },
  {
    title: "6. This Action Is Permanent",
    body: "Account deletion is irreversible. Once completed, your account cannot be recovered and you will need to create a new account to use SwiftMuv again.",
  },
];

const Section = ({ title, body }: { title: string; body: string }) => (
  <section className="scroll-mt-24">
    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 tracking-tight">
      {title}
    </h3>
    <p className="text-base text-muted-foreground leading-[1.85]">{body}</p>
  </section>
);

const AccountDeletion = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground border-b border-primary/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 overflow-visible">
              <img src={logo} alt="SwiftMuv" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight">SwiftMuv</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="opacity-80 hover:opacity-100 transition">
              Home
            </Link>
            <Link to="/about" className="opacity-80 hover:opacity-100 transition">
              About
            </Link>
            <Link to="/privacy-policy" className="opacity-80 hover:opacity-100 transition">
              Privacy Policy
            </Link>
            <Link to="/account-deletion" className="text-accent">
              Delete Account
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Account Deletion
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            How to permanently delete your SwiftMuv account and what happens to your data.
          </p>
          <p className="mt-2 text-xs uppercase tracking-wider font-semibold text-accent">
            Last Updated: August 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="flex-1 py-10 sm:py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <article className="rounded-2xl border bg-card p-6 sm:p-10 space-y-8">
            {sections.map((s) => (
              <Section key={s.title} {...s} />
            ))}
          </article>

          <p className="text-xs text-muted-foreground text-center mt-8">
            To request deletion, contact support@swiftmuv.com from your registered email address.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 overflow-visible">
              <img src={logo} alt="SwiftMuv" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-semibold">SwiftMuv</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/" className="opacity-80 hover:opacity-100">
              Home
            </Link>
            <Link to="/about" className="opacity-80 hover:opacity-100">
              About Us
            </Link>
            <Link to="/terms" className="opacity-80 hover:opacity-100">
              Terms
            </Link>
            <Link to="/privacy-policy" className="opacity-80 hover:opacity-100">
              Privacy Policy
            </Link>
            <Link to="/account-deletion" className="opacity-80 hover:opacity-100">
              Delete Account
            </Link>
          </nav>
          <p className="text-xs opacity-70">
            &copy; {new Date().getFullYear()} SwiftMuv. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AccountDeletion;
