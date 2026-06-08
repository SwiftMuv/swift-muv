import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/swiftmuv-logo.png";

const sections = [
  {
    title: "1. Ownership of Platform and Content",
    body: "All content, features, and functionality of the SwiftMuv platform—including but not limited to, the software, source code, designs, text, graphics, logos, icons, images, and the \"SwiftMuv\" brand name—are the exclusive property of [Insert Your Legal Entity Name/Samuel Laryea] and are protected by Canadian and international copyright, trademark, and other intellectual property laws.",
  },
  {
    title: "2. Limited License",
    body: "Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the SwiftMuv platform for its intended purpose: facilitating logistics and moving services. You may not reproduce, distribute, modify, create derivative works of, publicly display, or in any way exploit any of the material without our prior written consent.",
  },
  {
    title: "3. User Feedback",
    body: "If you provide us with any suggestions, ideas, or feedback regarding SwiftMuv, you agree that we may use such feedback for any purpose without any obligation to you, and you hereby assign to us all rights to such feedback.",
  },
  {
    title: "4. Trademarks",
    body: "\"SwiftMuv\" and all related graphics, logos, and service names are trademarks or trade dress of SwiftMuv in Canada. You may not use these without our prior written permission.",
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

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground border-b border-primary/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-accent/60 bg-card">
              <img src={logo} alt="SwiftMuv" className="w-full h-full object-cover" />
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
            <Link to="/terms-of-service" className="text-accent">
              Terms of Service
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
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Intellectual Property Rights and usage terms for the SwiftMuv platform.
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
            For questions about these Terms, contact support@swiftmuv.com.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-accent/60">
              <img src={logo} alt="SwiftMuv" className="w-full h-full object-cover" />
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
            © {new Date().getFullYear()} SwiftMuv. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
