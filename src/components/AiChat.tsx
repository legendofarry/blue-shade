import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Magnetic } from "./Magnetic";

type Msg = { role: "user" | "assistant"; content: string };

export function AiChat({ shop }: { shop: any }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm **AquaBot** 💧 Need help choosing a bottle, scheduling a refill, or have a question?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && (last as any).streaming) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc, streaming: true } as any];
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: next, context: shop }),
      });
      if (resp.status === 429) { upsert("⚠️ Rate limit reached. Try again shortly."); setLoading(false); return; }
      if (resp.status === 402) { upsert("⚠️ AI credits depleted. Please top up."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      setMessages((prev) => prev.map((m: any) => ({ ...m, streaming: false })));
    } catch (e) {
      console.error(e);
      upsert("Sorry — something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Magnetic
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 size-14 rounded-full text-primary-foreground shadow-glow gradient-aqua"
        strength={0.5}
      >
        <Sparkles className="size-6" />
      </Magnetic>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 600 }} animate={{ y: 0 }} exit={{ y: 600 }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
              className="glass w-full max-w-md rounded-t-3xl p-4 pb-6 max-h-[88vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-full gradient-aqua grid place-items-center text-primary-foreground"><Bot className="size-5" /></div>
                  <div>
                    <div className="font-bold text-sm">AquaBot</div>
                    <div className="text-xs text-muted-foreground">Always here · Powered by AI</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="size-9 rounded-full grid place-items-center hover:bg-secondary"><X className="size-4" /></button>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 px-1 py-2 no-scrollbar">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"}`}
                  >
                    <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
                {loading && <div className="text-xs text-muted-foreground">AquaBot is thinking…</div>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask anything…"
                  className="flex-1 rounded-full bg-background border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={send} disabled={loading} className="size-11 rounded-full gradient-aqua text-primary-foreground grid place-items-center disabled:opacity-50 shadow-soft">
                  <Send className="size-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
