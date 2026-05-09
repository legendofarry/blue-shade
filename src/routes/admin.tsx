import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Package, Megaphone, Settings as SettingsIcon, ShoppingBag, TrendingUp, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

type Tab = "orders" | "products" | "promos" | "settings";

function Admin() {
  const [tab, setTab] = useState<Tab>("orders");
  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div className="glass rounded-full flex items-center gap-2 px-2 py-2">
            <Link to="/" className="size-9 rounded-full grid place-items-center hover:bg-secondary"><ArrowLeft className="size-4" /></Link>
            <div className="font-extrabold">Blue Shade · Dashboard</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 mt-4">
        <div className="glass rounded-2xl p-1 grid grid-cols-4 gap-1">
          {(["orders", "products", "promos", "settings"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative rounded-xl py-2.5 text-xs font-bold capitalize ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`}>
              {tab === t && <motion.div layoutId="tabbg" className="absolute inset-0 gradient-hero rounded-xl shadow-soft" />}
              <span className="relative">{t === "promos" ? "Marketing" : t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 mt-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {tab === "orders" && <OrdersTab />}
            {tab === "products" && <ProductsTab />}
            {tab === "promos" && <PromosTab />}
            {tab === "settings" && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

const STATUSES = ["pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
      setOrders(data || []);
    };
    load();
    const ch = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    revenue: orders.filter(o => o.status === "delivered").reduce((a, b) => a + Number(b.total), 0),
  };

  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error("Update failed"); else toast.success(`→ ${status}`);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat icon={ShoppingBag} label="Orders" value={stats.total} />
        <Stat icon={Package} label="Pending" value={stats.pending} accent />
        <Stat icon={TrendingUp} label="Revenue" value={`KSh ${stats.revenue}`} />
      </div>

      <div className="space-y-2">
        {orders.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">No orders yet.</div>}
        {orders.map((o) => (
          <motion.div key={o.id} layout className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold">#{o.short_code}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="text-sm font-semibold mt-1">{o.customer_name} · <a href={`tel:${o.customer_phone}`} className="text-primary">{o.customer_phone}</a></div>
                <div className="text-xs text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleString()}</div>
                <div className="mt-2 text-sm">
                  {(o.items as any[]).map((i, idx) => <span key={idx} className="mr-2">{i.qty}× {i.name}</span>)}
                </div>
                {o.notes && <div className="text-xs text-muted-foreground italic mt-1">"{o.notes}"</div>}
                {o.lat && o.lng && (
                  <a href={`https://maps.google.com/?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-1 font-semibold">
                    <MapPin className="size-3" /> View on map
                  </a>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black text-gradient">KSh {o.total}</div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">{o.delivery_type} · {o.payment_method}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => update(o.id, s)} className={`text-[10px] px-2.5 py-1.5 rounded-full font-bold whitespace-nowrap ${o.status === s ? "gradient-aqua text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: any = {
    pending: "bg-amber-500/15 text-amber-700",
    accepted: "bg-blue-500/15 text-blue-700",
    preparing: "bg-violet-500/15 text-violet-700",
    out_for_delivery: "bg-cyan-500/15 text-cyan-700",
    delivered: "bg-emerald-500/15 text-emerald-700",
    cancelled: "bg-rose-500/15 text-rose-700",
  };
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${map[status]}`}>{status.replace(/_/g, " ")}</span>;
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className={`rounded-2xl p-3 border ${accent ? "gradient-hero text-primary-foreground border-transparent" : "bg-card border-border"}`}>
      <Icon className="size-4 opacity-80" />
      <div className="text-xs opacity-80 mt-1">{label}</div>
      <div className="text-lg font-extrabold leading-tight">{value}</div>
    </div>
  );
}

function ProductsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", kind: "refill", size_liters: 5, price: 70, description: "" });
  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("sort_order");
    setItems(data || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("adm-prod").on("postgres_changes", { event: "*", schema: "public", table: "products" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const add = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("products").insert({ ...form, sort_order: items.length + 1 } as any);
    if (error) toast.error(error.message); else { toast.success("Added"); setForm({ name: "", kind: "refill", size_liters: 5, price: 70, description: "" }); }
  };
  const toggle = async (id: string, active: boolean) => { await supabase.from("products").update({ active: !active }).eq("id", id); };
  const remove = async (id: string) => { await supabase.from("products").delete().eq("id", id); toast.success("Removed"); };
  const update = async (id: string, patch: any) => { await supabase.from("products").update(patch).eq("id", id); };

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
        <div className="font-bold mb-2">Add product</div>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-sm" />
          <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
            <option value="refill">Refill</option>
            <option value="empty_bottle">Empty bottle</option>
          </select>
          <input type="number" value={form.size_liters} onChange={e => setForm({ ...form, size_liters: +e.target.value })} placeholder="Size (L)" className="bg-background border border-border rounded-xl px-3 py-2 text-sm" />
          <input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} placeholder="Price" className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-sm" />
          <button onClick={add} className="col-span-2 gradient-hero text-primary-foreground font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1"><Plus className="size-4" /> Add product</button>
        </div>
      </div>

      {items.map(p => (
        <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2">
          <input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && update(p.id, { name: e.target.value })} className="flex-1 bg-transparent text-sm font-bold outline-none" />
          <input type="number" defaultValue={p.price} onBlur={(e) => +e.target.value !== Number(p.price) && update(p.id, { price: +e.target.value })} className="w-20 bg-secondary rounded-lg px-2 py-1 text-sm text-right font-bold" />
          <button onClick={() => toggle(p.id, p.active)} title="Toggle active">
            {p.active ? <ToggleRight className="size-6 text-primary" /> : <ToggleLeft className="size-6 text-muted-foreground" />}
          </button>
          <button onClick={() => remove(p.id)} className="text-rose-500"><Trash2 className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}

function PromosTab() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", badge: "", cta_label: "", cta_url: "", bg_gradient: "linear-gradient(135deg, oklch(0.78 0.14 195), oklch(0.55 0.17 230))" });
  const load = async () => {
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("adm-promo").on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const add = async () => {
    if (!form.title) return toast.error("Title required");
    const { error } = await supabase.from("promotions").insert(form as any);
    if (error) toast.error(error.message); else { toast.success("Promotion published"); setForm({ ...form, title: "", body: "", badge: "" }); }
  };
  const remove = async (id: string) => { await supabase.from("promotions").delete().eq("id", id); };
  const toggle = async (id: string, active: boolean) => { await supabase.from("promotions").update({ active: !active }).eq("id", id); };

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
        <div className="font-bold mb-2 flex items-center gap-2"><Megaphone className="size-4" /> New promotion</div>
        <div className="space-y-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. 20% off this week)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Body text" rows={2} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="Badge (NEW / OFFER)" className="bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            <input value={form.cta_label} onChange={e => setForm({ ...form, cta_label: e.target.value })} placeholder="Button label" className="bg-background border border-border rounded-xl px-3 py-2 text-sm" />
            <input value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })} placeholder="Button URL" className="col-span-2 bg-background border border-border rounded-xl px-3 py-2 text-sm" />
          </div>
          <input value={form.bg_gradient} onChange={e => setForm({ ...form, bg_gradient: e.target.value })} placeholder="CSS background" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono" />
          <div className="h-16 rounded-xl" style={{ background: form.bg_gradient }} />
          <button onClick={add} className="w-full gradient-hero text-primary-foreground font-bold rounded-xl py-2.5 text-sm">Publish</button>
        </div>
      </div>

      {items.map(p => (
        <div key={p.id} className="rounded-2xl p-4 text-primary-foreground relative overflow-hidden" style={{ background: p.bg_gradient }}>
          {p.badge && <span className="text-[10px] font-bold uppercase tracking-widest bg-white/25 px-2 py-1 rounded-full">{p.badge}</span>}
          <div className="font-extrabold mt-2">{p.title}</div>
          {p.body && <div className="text-xs opacity-90 mt-1">{p.body}</div>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => toggle(p.id, p.active)} className="bg-white/20 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full">{p.active ? "Active" : "Hidden"}</button>
            <button onClick={() => remove(p.id)} className="bg-white/20 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full"><Trash2 className="size-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => setS(data)); }, []);
  if (!s) return null;
  const save = async () => {
    const { error } = await supabase.from("shop_settings").update(s).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-3">
      <div className="font-bold flex items-center gap-2"><SettingsIcon className="size-4" /> Shop settings</div>
      <Field label="Shop name"><input value={s.shop_name} onChange={e => setS({ ...s, shop_name: e.target.value })} className="input" /></Field>
      <Field label="Tagline"><input value={s.tagline} onChange={e => setS({ ...s, tagline: e.target.value })} className="input" /></Field>
      <Field label="Hero message"><input value={s.hero_message ?? ""} onChange={e => setS({ ...s, hero_message: e.target.value })} className="input" /></Field>
      <Field label="Phone"><input value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })} className="input" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Delivery fee"><input type="number" value={s.base_delivery_fee} onChange={e => setS({ ...s, base_delivery_fee: +e.target.value })} className="input" /></Field>
        <Field label="Free delivery over"><input type="number" value={s.free_delivery_threshold} onChange={e => setS({ ...s, free_delivery_threshold: +e.target.value })} className="input" /></Field>
      </div>
      <label className="flex items-center justify-between bg-secondary rounded-xl p-3 text-sm font-semibold">
        <span>Open now</span>
        <button onClick={() => setS({ ...s, open_now: !s.open_now })}>
          {s.open_now ? <ToggleRight className="size-7 text-primary" /> : <ToggleLeft className="size-7 text-muted-foreground" />}
        </button>
      </label>
      <button onClick={save} className="w-full gradient-hero text-primary-foreground font-bold rounded-xl py-2.5 text-sm">Save settings</button>
      <style>{`.input { width: 100%; background: var(--color-background); border: 1px solid var(--color-border); border-radius: 12px; padding: 8px 12px; font-size: 14px; outline: none; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>{children}</div>;
}
