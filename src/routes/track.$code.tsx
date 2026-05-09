import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, Phone, Truck, Package, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Bottle } from "@/components/Bottle";

export const Route = createFileRoute("/track/$code")({
  component: TrackPage,
});

const STATUS_FLOW = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"] as const;
const STATUS_LABEL: Record<string, { label: string; icon: any; desc: string }> = {
  pending: { label: "Order placed", icon: Sparkles, desc: "We've received your order" },
  accepted: { label: "Accepted", icon: CheckCircle2, desc: "Confirmed by Blue Shade" },
  preparing: { label: "Refilling", icon: Package, desc: "Filling your bottles" },
  out_for_delivery: { label: "On the way", icon: Truck, desc: "Driver is heading to you" },
  delivered: { label: "Delivered", icon: CheckCircle2, desc: "Enjoy your water!" },
  cancelled: { label: "Cancelled", icon: Clock, desc: "Order cancelled" },
};

function TrackPage() {
  const { code } = Route.useParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("orders").select("*").eq("short_code", code).maybeSingle();
      setOrder(data);
    };
    load();
    const ch = supabase
      .channel(`order-${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (p) => {
        if ((p.new as any).short_code === code) setOrder(p.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [code]);

  if (!order) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  const stepIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-30">
        <div className="mx-auto max-w-md px-4 pt-3">
          <div className="glass rounded-full flex items-center gap-2 px-2 py-2">
            <Link to="/" className="size-9 rounded-full grid place-items-center hover:bg-secondary"><ArrowLeft className="size-4" /></Link>
            <div className="font-extrabold">Order #{order.short_code}</div>
          </div>
        </div>
      </header>

      <section className="px-4 mt-5 mx-auto max-w-md">
        <div className="rounded-3xl gradient-hero p-6 text-primary-foreground shadow-glow relative overflow-hidden">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute right-2 top-2 opacity-90">
            <Bottle size={0.5} fill={0.85} label={`${Math.round(order.items.reduce((a: number, b: any) => a + Number(b.size_liters) * b.qty, 0))}L`} />
          </motion.div>
          <div className="text-xs uppercase tracking-widest opacity-80 font-semibold">Status</div>
          <div className="text-3xl font-black">{STATUS_LABEL[order.status].label}</div>
          <div className="text-sm opacity-90 mt-1">{STATUS_LABEL[order.status].desc}</div>
        </div>
      </section>

      <section className="px-4 mt-6 mx-auto max-w-md">
        <div className="space-y-1">
          {STATUS_FLOW.map((s, i) => {
            const meta = STATUS_LABEL[s];
            const done = stepIdx >= i;
            const active = stepIdx === i;
            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={active ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className={`size-9 rounded-full grid place-items-center ${done ? "gradient-aqua text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >
                    <meta.icon className="size-4" />
                  </motion.div>
                  {i < STATUS_FLOW.length - 1 && <div className={`w-0.5 h-8 ${stepIdx > i ? "bg-primary" : "bg-border"}`} />}
                </div>
                <div className="pt-1.5 pb-4">
                  <div className={`font-bold text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.desc}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-4 mx-auto max-w-md">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Order summary</div>
          {order.items.map((it: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{it.qty}× {it.name}</span>
              <span className="font-semibold">KSh {it.qty * it.price}</span>
            </div>
          ))}
          <div className="h-px bg-border my-2" />
          <div className="flex justify-between text-sm"><span>Delivery</span><span>KSh {order.delivery_fee}</span></div>
          <div className="flex justify-between font-extrabold mt-1"><span>Total</span><span>KSh {order.total}</span></div>
        </div>

        <a href={`tel:0791366663`} className="mt-4 w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm">
          <Phone className="size-4" /> Call Blue Shade
        </a>
      </section>
    </main>
  );
}
