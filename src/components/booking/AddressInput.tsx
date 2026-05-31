import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AddressInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon?: "pickup" | "dropoff";
}

const AddressInput = ({ label, placeholder, value, onChange, icon = "pickup" }: AddressInputProps) => (
  <div className="flex items-start gap-3">
    <div className="mt-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
      <MapPin className="h-5 w-5" />
    </div>
    <div className="flex-1 space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 border-none bg-secondary/50 text-sm font-medium placeholder:text-muted-foreground/60"
      />
    </div>
  </div>
);

export default AddressInput;
