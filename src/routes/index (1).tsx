import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Droplet, Truck, Sparkles, Phone, ArrowRight, ShoppingBag, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WaterCanvas } from "@/components/WaterCanvas";
import { Magnetic } from "@/components/Magnetic";
import { Bottle } from "@/components/Bottle";
import { PromotionsCarousel } from "@/components/PromotionsCarousel";
import { AiChat } from "@/components/AiChat";
import { cart, useCart } from "@/lib/cart";

export const Route = createFileRoute("/")({
  component: Home,
});

interface Product { id: string; name: string; kind: string; size_liters: number; price: number; description: string | null; sort_order: number; active: boolean; }
interface Shop { shop_name: string; tagline: string; phone: string; base_delivery_fee: number; free_delivery_threshold: number; open_now: boolean; hero_message: string | null; }

function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -120]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.92]);
  const blobY = useTransform(scrollY, [0, 600], [0, 200]);

  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const cartState = useCart();

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("sort_order"),
        supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setProducts((p as any) || []);
      setShop(s as any);
    };
    load();
    const ch = supabase.channel("home").on("postgres_changes", { event: "*", schema: "public", table: "products" }, load).on("postgres_changes", { event: "*", schema: "public", table: "shop_settings" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const refills = products.filter(p => p.kind === "refill");
  const bottles = products.filter(p => p.kind === "empty_bottle");

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30">
        <div className="mx-auto max-w-md px-4 pt-3">
          <div className="glass rounded-full flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full gradient-aqua grid place-items-center text-primary-foreground shadow-soft">
                <Droplet className="size-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-tight">Blue Shade</div>
                <div className="text-[10px] text-muted-foreground -mt-0.5 flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${shop?.open_now ? "bg-emerald-500" : "bg-rose-500"} animate-pulse`} />
                  {shop?.open_now ? "Open now" : "Closed"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/admin" className="p-2 rounded-full hover:bg-secondary/70" aria-label="Dashboard">
                <LayoutDashboard className="size-4" />
              </Link>
              <a href={`tel:${shop?.phone ?? "0791366663"}`} className="p-2 rounded-full hover:bg-secondary/70" aria-label="Call">
                <Phone className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative pt-24 pb-12 px-4 mx-auto max-w-md">
        <motion.div style={{ y: blobY }} className="absolute -top-10 -right-20 w-[420px] h-[420px] opacity-90 pointer-events-none">
          <WaterCanvas className="w-full h-full" />
        </motion.div>

        <motion.div style={{ y: heroY, scale: heroScale }} className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Sparkles className="size-3" /> Refill · Deliver · Repeat
            </div>
            <h1 className="mt-3 text-[44px] leading-[1.02] font-black tracking-tight">
              Pure water,<br />
              <span className="text-gradient">delivered.</span>
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground max-w-xs">
              {shop?.hero_message || shop?.tagline || "We refill any bottle and bring it back — same day."}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Magnetic as="div" className="rounded-full">
                <Link to="/order" className="inline-flex items-center gap-2 gradient-hero text-primary-foreground font-bold px-5 py-3.5 rounded-full shadow-glow text-sm">
                  Order now <ArrowRight className="size-4" />
                </Link>
              </Magnetic>
              <a href={`tel:${shop?.phone ?? "0791366663"}`} className="inline-flex items-center gap-2 glass font-semibold px-4 py-3.5 rounded-full text-sm">
                <Phone className="size-4" /> Call
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Promotions */}
      <PromotionsCarousel />

      {/* Refills — horizontal scroll */}
      <section className="mt-8">
        <div className="px-4 flex items-end justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Refills</div>
            <h2 className="text-2xl font-extrabold">Pick a size</h2>
          </div>
          <Link to="/order" className="text-xs font-semibold text-primary">Build order →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar snap-x snap-mandatory">
          {refills.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </section>

      {/* Empty bottles */}
      {bottles.length > 0 && (
        <section className="mt-6 px-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Empty bottles</div>
          <h2 className="text-2xl font-extrabold mb-3">Buy a new one</h2>
          <div className="grid grid-cols-2 gap-3">
            {bottles.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05, type: "spring" }}
                className="rounded-2xl bg-card border border-border p-4 shadow-soft"
              >
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-2xl font-black text-gradient mt-1">KSh {p.price}</div>
                <button onClick={() => cart.add({ product_id: p.id, name: p.name, price: Number(p.price), size_liters: Number(p.size_liters), kind: p.kind, qty: 1 })}
                  className="mt-2 w-full text-xs font-bold gradient-aqua text-primary-foreground rounded-full py-2">Add</button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* How it works — scrollytelling */}
      <section className="mt-14 px-4 mx-auto max-w-md">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">How it works</div>
        <h2 className="text-2xl font-extrabold mb-4">Three taps to fresh water</h2>
        <div className="space-y-4">
          {[
            { icon: ShoppingBag, t: "Pick your bottles", d: "Choose any size — refill yours or buy new." },
            { icon: Truck, t: "Pin your spot", d: "We auto-detect your location for delivery." },
            { icon: Droplet, t: "Sip & relax", d: "Same-day drop-off, ice-cold purity." },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 80 }}
              className="flex gap-3 items-start glass rounded-2xl p-4"
            >
              <div className="size-10 rounded-xl gradient-aqua text-primary-foreground grid place-items-center shrink-0 shadow-soft">
                <s.icon className="size-5" />
              </div>
              <div>
                <div className="font-bold">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
              </div>
              <div className="ml-auto text-3xl font-black text-muted/40">0{i + 1}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="mt-14 mb-28 px-4 mx-auto max-w-md">
        <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 text-primary-foreground shadow-glow">
          <motion.div className="absolute -top-10 -right-10 w-48 h-48 opacity-30" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
            <WaterCanvas className="w-full h-full" />
          </motion.div>
          <div className="relative">
            <h3 className="text-2xl font-extrabold leading-tight">Thirsty?<br />We're 5 minutes away.</h3>
            <p className="text-sm opacity-90 mt-2">Tap below — pin your spot — done.</p>
            <Magnetic as="div" className="mt-4 rounded-full">
              <Link to="/order" className="inline-flex items-center gap-2 bg-white text-primary font-bold px-5 py-3 rounded-full shadow-soft text-sm">
                Start an order <ArrowRight className="size-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
        <div className="text-center text-[11px] text-muted-foreground mt-6">© Blue Shade · Purified Drinking Water</div>
      </section>

      {/* Floating cart bar */}
      {cartState.items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-4 inset-x-4 z-40 max-w-md mx-auto"
        >
          <Link to="/order" className="glass shadow-glow rounded-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-full gradient-aqua grid place-items-center text-primary-foreground font-bold text-sm">{cart.count()}</div>
              <div className="text-sm font-semibold">View order</div>
            </div>
            <div className="font-extrabold text-gradient">KSh {cart.total()}</div>
          </Link>
        </motion.div>
      )}

      <AiChat shop={shop} />
    </main>
  );
}

function ProductCard({ p, index }: { p: Product; index: number }) {
  const cartState = useCart();
  const inCart = cartState.items.find(x => x.product_id === p.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 90 }}
      className="snap-center shrink-0 w-44 rounded-3xl gradient-bottle p-4 shadow-pop text-white relative overflow-hidden"
    >
      <div className="text-xs font-semibold opacity-80">{p.size_liters}L Refill</div>
      <div className="text-3xl font-black">KSh {p.price}</div>
      <div className="my-2 grid place-items-center h-32">
        <Bottle size={p.size_liters >= 20 ? 0.85 : p.size_liters >= 10 ? 0.7 : p.size_liters >= 5 ? 0.55 : 0.45} fill={0.78} label={`${p.size_liters}L`} />
      </div>
      <button
        onClick={() => cart.add({ product_id: p.id, name: p.name, price: Number(p.price), size_liters: Number(p.size_liters), kind: p.kind, qty: 1 })}
        className="w-full bg-white/95 text-primary font-bold rounded-full py-2 text-xs shadow-soft active:scale-95 transition-transform"
      >
        {inCart ? `In cart · ${inCart.qty}` : "Add to order"}
      </button>
    </motion.div>
  );
}
