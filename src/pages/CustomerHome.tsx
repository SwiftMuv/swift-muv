import { useNavigate } from "react-router-dom";
import { ArrowRight, Truck, Clock, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import satisfiedCustomers from "@/assets/satisfied-customers.jpg";

const CustomerHome = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h1
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          SwiftGo
        </h1>
        <button
          onClick={() => signOut()}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </header>

      <div className="flex-1 space-y-6 p-4 pb-8">
        <div className="relative overflow-hidden rounded-2xl shadow-lg">
          <img
            src={satisfiedCustomers}
            alt="Satisfied SwiftGo customers smiling outside their new home"
            width={1280}
            height={768}
            className="h-52 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              ★ 4.9 from 12,000+ moves
            </p>
            <h2
              className="mt-1 text-2xl font-bold leading-tight text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Trusted by happy movers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Book a verified pro in under a minute.
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/book")}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          Book a Move
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Truck, label: "Pro drivers" },
            { icon: Clock, label: "On-time" },
            { icon: Shield, label: "Insured" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-center"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
