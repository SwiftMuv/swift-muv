import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/swiftmuv-logo.png";

const customerSections = [
  {
    title: "1. Nature of the Marketplace",
    body: "SwiftMuv is a technology platform that connects users with independent logistics providers. SwiftMuv is not a common carrier, freight forwarder, or moving company, and does not itself transport goods.",
  },
  {
    title: "2. Bookings & Algorithmic Pricing",
    body: "Customers agree to pay the transparent, upfront pricing calculated by the platform's quote engine at the time of booking. Quotes reflect distance, vehicle category, declared inventory, and applicable service fees.",
  },
  {
    title: "3. Cargo Declarations",
    body: "Customers must declare all items accurately, including quantity, size, and weight. Shipping of hazardous, illegal, perishable, or otherwise prohibited materials is strictly banned and may result in immediate cancellation and account suspension.",
  },
  {
    title: "4. Payment Protocols",
    body: "All transactions must be processed securely through the platform's authorized payment gateway. Off-platform deals, cash side-payments, or attempts to circumvent the marketplace are strictly prohibited and constitute a material breach of these Terms.",
  },
];

const providerSections = [
  {
    title: "1. Independent Contractor Status",
    body: "Providers explicitly acknowledge and agree that they are independent contractors using SwiftMuv's software to obtain bookings. Nothing in these Terms creates an employment, agency, partnership, or joint-venture relationship with SwiftMuv.",
  },
  {
    title: "2. Onboarding & Verification",
    body: "Providers must successfully complete and maintain SwiftMuv's verification workflows, including a valid driver's license, clean background check, and mandatory commercial vehicle liability insurance for the vehicle(s) operated on the platform.",
  },
  {
    title: "3. Performance Standards",
    body: "Providers are expected to uphold high standards of punctuality, velocity, professionalism, and safety on every job. Persistent failure to meet these standards may result in reduced visibility, suspension, or removal from the marketplace.",
  },
  {
    title: "4. Escrow & Commission",
    body: "SwiftMuv holds booking funds in escrow and deducts a marketplace service fee from the booking total before initiating vendor settlement. Net earnings are released to the provider via automated digital deposits in accordance with the payout schedule.",
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

const Terms = () => {
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
            <Link to="/terms" className="text-accent">
              Terms
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
            Terms and Conditions
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Please read these terms carefully before using the SwiftMuv marketplace.
          </p>
          <p className="mt-2 text-xs uppercase tracking-wider font-semibold text-accent">
            Last Updated: May 2026
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="flex-1 py-10 sm:py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted rounded-xl mb-8">
              <TabsTrigger
                value="customer"
                className="h-full rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                Customer Terms
              </TabsTrigger>
              <TabsTrigger
                value="provider"
                className="h-full rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                Logistics Provider Terms
              </TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="mt-0">
              <article className="rounded-2xl border bg-card p-6 sm:p-10 space-y-8">
                {customerSections.map((s) => (
                  <Section key={s.title} {...s} />
                ))}
              </article>
            </TabsContent>

            <TabsContent value="provider" className="mt-0">
              <article className="rounded-2xl border bg-card p-6 sm:p-10 space-y-8">
                {providerSections.map((s) => (
                  <Section key={s.title} {...s} />
                ))}
              </article>
            </TabsContent>
          </Tabs>

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
          </nav>
          <p className="text-xs opacity-70">
            © {new Date().getFullYear()} SwiftMuv. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
