import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";
import heroWallpaper from "@/assets/home-hero-wallpaper.jpg";
import vehicle1 from "@/assets/customer-vehicle-1.jpg";
import vehicle2 from "@/assets/customer-vehicle-2.jpg";
import vehicle3 from "@/assets/customer-vehicle-3.jpg";
import vehicle4 from "@/assets/customer-vehicle-4.jpg";
import vehicle5 from "@/assets/customer-vehicle-5.jpg";
import vehicle6 from "@/assets/customer-vehicle-6.jpg";
import vehicle7 from "@/assets/customer-vehicle-7.jpg";
import vehicle8 from "@/assets/customer-vehicle-8.jpg";
import vehicle9 from "@/assets/customer-vehicle-9.jpg";
import vehicle10 from "@/assets/customer-vehicle-10.jpg";

const testimonials = [
  {
    name: "Amelia R.",
    location: "Studio move • Brooklyn → Queens",
    quote: "My SwiftMuv driver wrapped my vintage dresser like it was his own. Door-to-door in under 90 minutes — I didn't lift a thing.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
    photo: vehicle1,
  },
  {
    name: "Marcus T.",
    location: "2-bedroom apartment • Downtown LA",
    quote: "Booked a SwiftMuv truck on a Sunday night, driver pulled up Monday at 8am sharp. Live tracking + a 4-digit handoff code felt seriously legit.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop",
    photo: vehicle2,
  },
  {
    name: "Priya S.",
    location: "Office relocation • Mission District",
    quote: "We moved our whole studio with SwiftMuv. Pro Verified driver, padded blankets, transparent quote — zero surprises on the invoice.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop",
    photo: vehicle3,
  },
  {
    name: "Daniel & Sofia K.",
    location: "First home • Austin, TX",
    quote: "Moving into our first house was stressful until SwiftMuv showed up. The crew handled our nursery furniture with so much care.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80&auto=format&fit=crop",
    photo: vehicle4,
  },
  {
    name: "Jordan H.",
    location: "3-bedroom move • Seattle",
    quote: "Massive box truck showed up right on time. Crew loaded everything in under an hour — total game changer.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop",
    photo: vehicle5,
  },
  {
    name: "Nadia O.",
    location: "Long distance • Chicago → Detroit",
    quote: "Highway haul handled flawlessly. Live tracking the whole way, and not a single scratch on my furniture.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop",
    photo: vehicle6,
  },
  {
    name: "Eli W.",
    location: "Studio move • Boston",
    quote: "Box truck rolled up to my walk-up, driver was a pro. Easiest move I've ever done in this city.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80&auto=format&fit=crop",
    photo: vehicle7,
  },
  {
    name: "Hana M.",
    location: "Moving truck • Denver",
    quote: "Big moving truck rolled up right on time — fit everything from my one-bedroom in one trip. Fast, friendly, fairly priced.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80&auto=format&fit=crop",
    photo: vehicle8,
  },
  {
    name: "Tomás G.",
    location: "Moving truck • Houston",
    quote: "The crew loaded our whole 3-bedroom into a single moving truck. Smooth ride, zero damage, exactly what was quoted.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=80&auto=format&fit=crop",
    photo: vehicle9,
  },
  {
    name: "Olivia C.",
    location: "Moving truck • Toronto",
    quote: "Our SwiftMuv moving truck driver had everything wrapped, loaded, and delivered before lunch. Total pros.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80&auto=format&fit=crop",
    photo: vehicle10,
  },
];

const videos = [
  {
    title: "On the highway",
    subtitle: "A van cruising in transit",
    poster: "https://images.unsplash.com/photo-1605152276897-4f618f831968?w=800&q=80&auto=format&fit=crop",
    src: "https://videos.pexels.com/video-files/3066466/3066466-hd_1920_1080_24fps.mp4",
  },
  {
    title: "Through the city",
    subtitle: "Live moves from pickup to drop-off",
    poster: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80&auto=format&fit=crop",
    src: "https://videos.pexels.com/video-files/2103099/2103099-hd_1920_1080_30fps.mp4",
  },
  {
    title: "Open road",
    subtitle: "Your move, in safe hands",
    poster: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80&auto=format&fit=crop",
    src: "https://videos.pexels.com/video-files/4271760/4271760-hd_1920_1080_25fps.mp4",
  },
];

export const CustomerHomeScreen = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 pb-4">
      {/* Hero with wallpaper */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 min-h-[220px]">
        <img
          src={heroWallpaper}
          alt="Happy SwiftMuv customer next to a moving van"
          width={1280}
          height={768}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative p-5 pt-32">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">{t("customer.welcome")}</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground leading-tight drop-shadow">
            {t("customer.heroTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("customer.heroSubtitle")}
          </p>
        </div>
      </div>

      {/* Satisfied customers */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t("customer.happyCustomers")}</h3>
          <span className="text-xs text-muted-foreground">{t("customer.averageRating")}</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-muted">
                <img
                  src={t.photo}
                  alt={`${t.name} SwiftMuv move`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                  <img
                    src={t.avatar}
                    alt={`${t.name} avatar`}
                    loading="lazy"
                    className="w-9 h-9 rounded-full object-cover border-2 border-primary/60"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate drop-shadow">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.location}</p>
                  </div>
                  <div className="ml-auto flex">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Quote className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.quote}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Videos */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">{t("customer.videosTitle")}</h3>
        <div className="grid grid-cols-1 gap-3">
          {videos.map((v) => (
            <Card key={v.title} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <video
                  src={v.src}
                  poster={v.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                <p className="font-semibold text-sm text-foreground">{v.title}</p>
                <p className="text-xs text-muted-foreground">{v.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CustomerHomeScreen;
