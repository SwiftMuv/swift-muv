import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface Review {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

interface Props {
  driverId: string;
  limit?: number;
  title?: string;
}

const DriverReviews = ({ driverId, limit = 5, title = "Recent reviews" }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ratings")
        .select("id, stars, comment, created_at")
        .eq("ratee_id", driverId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!active) return;
      setReviews((data ?? []) as Review[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [driverId, limit]);

  const withComments = reviews.filter((r) => r.comment && r.comment.trim().length > 0);
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {avg && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-medium text-foreground">{avg}</span>
            <span>· {reviews.length}</span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading reviews…</p>
      ) : withComments.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-xs text-muted-foreground">
            No written reviews yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {withComments.map((r) => (
            <Card key={r.id} className="border-border/60">
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${
                          n <= r.stars ? "fill-primary text-primary" : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-snug">{r.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default DriverReviews;
