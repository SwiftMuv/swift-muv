import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

interface AppReview {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

const AppFeedbackScreen = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<AppReview[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("app_reviews")
      .select("id, stars, comment, created_at")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data as AppReview[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!user) return;
    if (stars < 1) return toast.error(t("drv.feedback.rateApp"));
    setSubmitting(true);
    const { error } = await supabase.from("app_reviews").insert({
      driver_id: user.id,
      stars,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(t("drv.feedback.thanks"));
    setStars(5);
    setComment("");
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("drv.feedback.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">{t("drv.feedback.appPerformance")}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setStars(n)} aria-label={t("drv.feedback.starsLabel", { n })}>
                  <Star className={`h-7 w-7 ${n <= stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">{t("drv.feedback.improveLabel")}</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("drv.feedback.placeholder")}
              maxLength={1000}
              rows={5}
            />
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("drv.feedback.submit")}
          </Button>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("drv.feedback.recent")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((r) => (
              <div key={r.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                {r.comment && <p className="text-sm text-foreground mt-1">{r.comment}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AppFeedbackScreen;
