import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/swiftmuv-logo.png";

const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect personal information you provide directly, such as your name, email address, phone number, and payment details when you register or make a booking. We also collect location data during active trips for tracking and safety purposes, and usage data to improve our platform.",
  },
  {
    title: "2. How We Use Your Information",
    body: "Your information is used to provide and improve our services, process transactions, match customers with drivers, send notifications, and ensure platform security. We may also use aggregated data for analytics and service optimization.",
  },
  {
    title: "3. Information Sharing",
    body: "We do not sell your personal information. We share necessary data with drivers and customers to facilitate bookings, with payment processors to handle transactions, and with service providers who assist our operations. All third parties are bound by confidentiality obligations.",
  },
  {
    title: "4. Data Security",
    body: "We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure.",
  },
  {
    title: "5. Your Rights",
    body: "You have the right to access, correct, or delete your personal information. You may also object to certain processing activities or request data portability. Contact us at support@swiftmuv.com to exercise these rights.",
  },
  {
    title: "6. Cookies & Tracking",
    body: "We use cookies and similar technologies to enhance your experience, remember preferences, and analyze usage patterns. You can manage cookie preferences through your browser settings.",
  },
  {
    title: "7. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notifications. Continued use of SwiftMuv after changes constitutes acceptance of the updated policy.",
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

const PrivacyPolicy = () => {
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
            <Link to="/terms" className="opacity-80 hover:opacity-100 transition">
              Terms
            </Link>
            <Link to="/privacy-policy" className="text-accent">
              Privacy Policy
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            How SwiftMuv collects, uses, and protects your personal information.
          </p>
          <p className="mt-2 text-xs uppercase tracking-wider font-semibold text-accent">
            Last Updated: May 2026
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
            For privacy-related questions, contact support@swiftmuv.com.
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
            <Link to="/terms-of-service" className="opacity-80 hover:opacity-100">
              Terms of Service
            </Link>
            <Link to="/privacy-policy" className="opacity-80 hover:opacity-100">
              Privacy Policy
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

export default PrivacyPolicy;
