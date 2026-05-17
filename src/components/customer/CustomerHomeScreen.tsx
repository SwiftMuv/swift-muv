import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import heroWallpaper from "@/assets/home-hero-wallpaper.jpg";

const testimonials = [
  {
    name: "Amelia R.",
    location: "Studio move • Brooklyn → Queens",
    quote: "My SwiftMuv driver wrapped my vintage dresser like it was his own. Door-to-door in under 90 minutes — I didn't lift a thing.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
    photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80&auto=format&fit=crop",
  },
  {
    name: "Marcus T.",
    location: "2-bedroom apartment • Downtown LA",
    quote: "Booked a SwiftMuv truck on a Sunday night, driver pulled up Monday at 8am sharp. Live tracking + a 4-digit handoff code felt seriously legit.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop",
    photo: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80&auto=format&fit=crop",
  },
  {
    name: "Priya S.",
    location: "Office relocation • Mission District",
    quote: "We moved our whole studio with SwiftMuv. Pro Verified driver, padded blankets, transparent quote — zero surprises on the invoice.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop",
    photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80&auto=format&fit=crop",
  },
  {
    name: "Daniel & Sofia K.",
    location: "First home • Austin, TX",
    quote: "Moving into our first house was stressful until SwiftMuv showed up. The crew handled our nursery furniture with so much care.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80&auto=format&fit=crop",
    photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80&auto=format&fit=crop",
  },
];

const videos = [
  {
    title: "On the highway",
    subtitle: "SwiftMuv truck cruising in transit",
    poster: "https://images.unsplash.com/photo-1601233749202-95d04d5b3c00?w=800&q=80&auto=format&fit=crop",
    src: "https://videos.pexels.com/video-files/2103099/2103099-hd_1920_1080_30fps.mp4",
  },
  {
    title: "Through the city",
    subtitle: "Live tracking from pickup to drop-off",
    poster: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80&auto=format&fit=crop",
    src: "https://videos.pexels.com/video-files/3066466/3066466-hd_1920_1080_24fps.mp4",
  },
  {
    title: "Open road",
    subtitle: "Your move, in safe hands",
    poster: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&q=80&auto=format&fit=crop",
    src: "https://videos.pexels.com/video-files/4271760/4271760-hd_1920_1080_25fps.mp4",
  },
];

export const CustomerHomeScreen = () => {
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
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Welcome back</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground leading-tight drop-shadow">
            Move smarter with SwiftMuv
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trusted by thousands of happy customers across the city.
          </p>
        </div>
      </div>

      {/* Satisfied customers */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h3 className="text-lg font-semibold text-foreground">Happy customers</h3>
          <span className="text-xs text-muted-foreground">4.9 ★ average</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={t.avatar}
                    alt={`${t.name} avatar`}
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <div className="flex">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.quote}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Videos */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">SwiftMuv vehicles in transit</h3>
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
