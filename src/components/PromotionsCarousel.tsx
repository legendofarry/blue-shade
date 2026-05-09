import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Promotion {
  id: string;
  title: string;
  body: string | null;
  badge: string | null;
  cta_label: string | null;
  cta_url: string | null;
  bg_gradient: string | null;
  active: boolean;
}

export function PromotionsCarousel() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("promotions").select("*").eq("active", true).order("created_at", { ascending: false });
      setPromos((data as any) || []);
    };
    load();
    const ch = supabase.channel("promos").on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (promos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % promos.length), 5000);
    return () => clearInterval(t);
  }, [promos.length]);

  if (!promos.length) return null;
  const p = promos[idx];

  return (
    <div className="px-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Offers</div>
      <div className="relative h-40 rounded-3xl overflow-hidden shadow-pop">
        <AnimatePresence mode="wait">
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 1.05, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.97, x: -30 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 p-5 flex flex-col justify-between text-primary-foreground"
            style={{ background: p.bg_gradient || "var(--gradient-hero)" }}
          >
            <div className="flex items-start justify-between">
              {p.badge && <span className="text-[10px] font-bold uppercase tracking-widest bg-white/25 px-2 py-1 rounded-full backdrop-blur">{p.badge}</span>}
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">{p.title}</h3>
              {p.body && <p className="text-sm opacity-90 mt-1 line-clamp-2">{p.body}</p>}
              {p.cta_label && p.cta_url && (
                <a href={p.cta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold mt-2 opacity-90 hover:opacity-100">
                  {p.cta_label} <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-2 right-3 flex gap-1">
          {promos.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
