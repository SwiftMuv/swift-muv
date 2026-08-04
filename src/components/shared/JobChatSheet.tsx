import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface Props {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

const JobChatSheet = ({ jobId, open, onOpenChange, title = "Chat" }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!open || !jobId) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("job_messages")
        .select("id, sender_id, body, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      if (active) setMessages((data as Message[]) ?? []);
    };
    load();

    const channel = supabase
      .channel(`job-chat-${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_messages", filter: `job_id=eq.${jobId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !userId) return;
    setSending(true);
    const { error } = await supabase.from("job_messages").insert({ job_id: jobId, sender_id: userId, body });
    setSending(false);
    if (error) {
      toast.error("Message could not be sent");
      return;
    }
    setDraft("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[80vh] flex-col rounded-t-2xl p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left text-base">{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <p className="pt-8 text-center text-sm text-muted-foreground">
              No messages yet. Say hello 👋
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.body}
                  <span className="mt-1 block text-[10px] opacity-60">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Type a message…"
            maxLength={2000}
          />
          <Button size="icon" onClick={() => void send()} disabled={sending || !draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default JobChatSheet;
