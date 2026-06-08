import { Link } from "react-router-dom";
import { ArrowLeft, Zap, Eye, ShieldCheck, BadgeCheck } from "lucide-react";
import logo from "@/assets/swiftmuv-logo.png";

const values = [
  {
    icon: Zap,
    title: "Velocity",
    desc: "Eliminating roadblocks and delays through real-time execution and automated matching.",
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    desc: "Clear, upfront pricing and real-time tracking so users never have to guess.",
  },
  {
    icon: ShieldCheck,
    title: "Uncompromising Security",
    desc: "Rigorous provider vetting and secure payment processing.",
  },
  {
    icon: BadgeCheck,
    title: "Absolute Reliability",
    desc: "High system dependability and peace of mind on every journey.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30 bg-card">
              <img src={logo} alt="SwiftMuv" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg tracking-tight">SwiftMuv</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-foreground">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: "var(--gradient-primary)" }}
          aria-hidden
        />
        <div className="relative max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Redefining Local Logistics.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Moving What Matters.
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            A lightning-fast, secure digital marketplace built to make item transport
            transparent, affordable, and effortless.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Our Story</h2>
          <p className="text-base sm:text-lg leading-relaxed text-muted-foreground">
            At SwiftMuv, we believe that moving items—whether it's a single piece of
            furniture or an entire inventory shipment—should never be a source of stress.
            Traditionally, local logistics has been plagued by friction: opaque pricing,
            unreliable timelines, and endless back-and-forth communication. We built
            SwiftMuv to change that. SwiftMuv is a lightning-fast, secure digital
            marketplace designed to connect customers with top-tier, verified logistics
            providers instantly. By leveraging modern technology, we remove the guesswork
            from transit, offering radical transparency, real-time tracking, and upfront
            pricing you can trust. Our mission is simple: to provide an intuitive
            platform that makes item transport transparent, affordable, and entirely
            effortless.
          </p>
        </div>
      </section>

      {/* Core values */}
      <section className="py-16 sm:py-20 px-4 bg-[hsl(var(--section))] border-y">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Our Core Values</h2>
            <p className="mt-3 text-muted-foreground">The principles that drive every move.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border bg-card p-6 hover:shadow-[var(--shadow-primary)] transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-primary/30">
              <img src={logo} alt="SwiftMuv" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold">SwiftMuv</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              About Us
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SwiftMuv. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
