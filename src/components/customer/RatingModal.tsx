import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  jobId: string | null;
  driverId: string | null;
  onClose: () => void;
}

export const RatingModal = ({ open, jobId, driverId, onClose }: Props) => {
  const { user } = useAuth();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setStars(5); setComment(""); } }, [open]);

  const submit = async () => {
    if (!user || !jobId || !driverId) return;
    setSubmitting(true);
    const { error } = await supabase.from("ratings").insert({
      job_id: jobId, rater_id: user.id, ratee_id: driverId, stars, comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for your rating!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>How was your move?</DialogTitle></DialogHeader>
        <div className="flex justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setStars(n)}>
              <Star className={`h-8 w-8 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a note for your driver (optional)" maxLength={500} />
        <DialogFooter>
          <Button onClick={submit} disabled={submitting} className="w-full">Submit rating</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
