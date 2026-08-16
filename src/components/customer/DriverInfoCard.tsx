import { ReactNode } from "react";
import { MessageSquare, Phone, MoreHorizontal, Star, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DriverInfoCardProps {
  statusTitle: string;
  statusSubtitle?: string;
  pickupAddress?: string;
  driverName: string;
  driverPhoto?: string;
  driverInitials?: string;
  driverRating?: number;
  vehicleModel: string;
  vehicleColor?: string;
  licensePlate: string;
  isTopRated?: boolean;
  vehicleImage?: string;
  onMessage: () => void;
  onCall: () => void;
  messageLabel?: string;
  callLabel?: string;
  optionsLabel?: string;
  optionsItems?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const DriverInfoCard = ({
  statusTitle,
  statusSubtitle,
  pickupAddress,
  driverName,
  driverPhoto,
  driverInitials,
  driverRating,
  vehicleModel,
  vehicleColor,
  licensePlate,
  isTopRated,
  vehicleImage,
  onMessage,
  onCall,
  messageLabel = "Message",
  callLabel = "Call",
  optionsLabel = "Options",
  optionsItems,
  children,
  className,
}: DriverInfoCardProps) => {
  const initials =
    driverInitials ??
    driverName
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const displayVehicle = [vehicleColor, vehicleModel].filter(Boolean).join(" ") || vehicleModel;

  return (
    <div
      className={cn(
        "w-full rounded-t-3xl border-t border-white/10 bg-[#121212] text-white shadow-2xl",
        className,
      )}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="h-1.5 w-10 rounded-full bg-white/20" />
      </div>

      {/* Status header */}
      <div className="px-5 pb-4 text-center">
        <h3
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {statusTitle}
        </h3>
        {statusSubtitle && (
          <p className="mt-1 text-sm text-white/60">{statusSubtitle}</p>
        )}
        {pickupAddress && (
          <p className="mt-1 text-xs text-white/40 truncate">{pickupAddress}</p>
        )}
      </div>

      {/* Driver & vehicle inner card */}
      <div className="mx-4 mb-4 rounded-2xl bg-[#1e1e1e] p-4">
        <div className="flex items-center gap-4">
          {/* Driver photo with rating badge */}
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16 ring-2 ring-white/10">
              {driverPhoto && <AvatarImage src={driverPhoto} alt={driverName} />}
              <AvatarFallback className="bg-white/10 text-white text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            {driverRating != null && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-white shadow-md ring-1 ring-white/10">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                {driverRating.toFixed(2)}
              </div>
            )}
          </div>

          {/* Driver name, vehicle, badge */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold uppercase tracking-wide">
              {driverName}
            </p>
            <p className="truncate text-sm text-white/60">{displayVehicle}</p>
            {isTopRated && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/25">
                <Award className="h-3 w-3" />
                Top-rated driver
              </div>
            )}
          </div>

          {/* License plate + vehicle image */}
          <div className="shrink-0 text-right">
            {vehicleImage && (
              <img
                src={vehicleImage}
                alt={displayVehicle}
                loading="lazy"
                className="ml-auto h-10 w-16 object-contain"
              />
            )}
            {licensePlate && (
              <div className="mt-1 inline-flex items-center rounded-md bg-white px-2 py-1 font-mono text-xs font-bold text-black tracking-wide">
                {licensePlate}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={onMessage}
          className="h-12 gap-2 rounded-xl border-white/10 bg-[#2c2c2c] px-5 text-sm font-semibold text-white hover:bg-[#3a3a3a] hover:text-white active:scale-95 transition"
        >
          <MessageSquare className="h-4 w-4" />
          {messageLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCall}
          className="h-12 w-12 rounded-xl border-white/10 bg-[#2c2c2c] p-0 text-white hover:bg-[#3a3a3a] hover:text-white active:scale-95 transition"
          aria-label={callLabel}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-12 rounded-xl border-white/10 bg-[#2c2c2c] p-0 text-white hover:bg-[#3a3a3a] hover:text-white active:scale-95 transition"
              aria-label={optionsLabel}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#1e1e1e] text-white border-white/10">
            {optionsItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Extra bottom-sheet content (e.g. completion code) */}
      {children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

export default DriverInfoCard;
