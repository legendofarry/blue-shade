import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Truck, Store, CreditCard, Banknote, Smartphone, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker } from "@/components/LocationPicker";
import { Bottle } from "@/components/Bottle";
import { cart, useCart, type CartItem } from "@/lib/cart";
import { Magnetic } from "@/components/Magnetic";
import { toast } from "sonner";

export const Route = createFileRoute("/order")({
  component: OrderPage,
});

interface Product { id: string; name: string; kind: string; size_liters: number; price: number; }
interface Settings { base_delivery_fee: number; free_delivery_threshold: number; }

function OrderPage() {
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({ base_delivery_fee: 50, free_delivery_threshold: 500 });
  const cs = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLabel, setAddressLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<"cash" | "mpesa" | "card">("mpesa");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("active", true).order("sort_order").then(({ data }) => setProducts((data as any) || []));
    supabase.from("shop_settings").select("base_delivery_fee, free_delivery_threshold").eq("id", 1).maybeSingle().then(({ data }) => data && setSettings(data as any));
  }, []);

  const subtotal = cart.total();
  const deliveryFee = deliveryType === "pickup" || subtotal >= Number(settings.free_delivery_threshold) ? 0 : Number(settings.base_delivery_fee);
  const total = subtotal + deliveryFee;

  const submit = async () => {
    if (!cs.items.length) return toast.error("Add at least one item");
    if (!name.trim() || !phone.trim()) return toast.error("Name and phone are required");
    if (deliveryType === "delivery" && !location) return toast.error("Please pin your location");

    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      address_label: addressLabel.trim() || null,
      notes: notes.trim() || null,
      delivery_type: deliveryType,
      items: cs.items as any,
      subtotal, delivery_fee: deliveryFee, total,
      payment_method: payment,
      lat: location?.lat ?? null, lng: location?.lng ?? null,
    }).select("short_code").maybeSingle();
    setSubmitting(false);
    if (error) { console.error(error); return toast.error("Could not place order"); }
    toast.success("Order placed!");
    cart.clear();
    nav({ to: "/track/$code", params: { code: data!.short_code } });
  };

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30">
        <div className="mx-auto max-w-md px-4 pt-3">
          <div className="glass rounded-full flex items-center gap-2 px-2 py-2">
            <Link to="/" className="size-9 rounded-full grid place-items-center hover:bg-secondary"><ArrowLeft className="size-4" /></Link>
            <div className="font-extrabold">Build your order</div>
          </div>
        </div>
      </header>

      <section className="px-4 pt-5 mx-auto max-w-md">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Items</div>
        <h2 className="text-xl font-extrabold mb-3">Choose & customize</h2>
        <div className="space-y-2">
          {products.map((p) => {
            const item = cs.items.find((i) => i.product_id === p.id);
            return (
              <motion.div
                key={p.id}
                layout
                className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-soft"
              >
                <div className="w-12 h-16 grid place-items-center shrink-0">
                  <Bottle size={0.28} fill={0.75} label={`${p.size_liters}L`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.kind === "refill" ? "Refill" : "New bottle"} · KSh {p.price}</div>
                </div>
                <QtyControl
                  qty={item?.qty || 0}
                  onAdd={() => cart.add({ product_id: p.id, name: p.name, price: Number(p.price), size_liters: Number(p.size_liters), kind: p.kind, qty: 1 } as CartItem)}
                  onSub={() => item && cart.setQty(p.id, item.qty - 1)}
                />
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-6 mx-auto max-w-md">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Fulfilment</div>
        <h2 className="text-xl font-extrabold mb-3">How should we get it to you?</h2>
        <div className="grid grid-cols-2 gap-2">
          <Choice active={deliveryType === "delivery"} onClick={() => setDeliveryType("delivery")} icon={<Truck className="size-5" />} label="Delivery" sub="We come to you" />
          <Choice active={deliveryType === "pickup"} onClick={() => setDeliveryType("pickup")} icon={<Store className="size-5" />} label="Pickup" sub="Skip the fee" />
        </div>

        {deliveryType === "delivery" && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-muted-foreground">Your location</label>
            <div className="mt-2"><LocationPicker value={location} onChange={setLocation} /></div>
            <input value={addressLabel} onChange={(e) => setAddressLabel(e.target.value)} placeholder="Address label (e.g. Apt 4B, gate code)" className="mt-2 w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        )}
      </section>

      <section className="px-4 mt-6 mx-auto max-w-md">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Payment</div>
        <h2 className="text-xl font-extrabold mb-3">How will you pay?</h2>
        <div className="grid grid-cols-3 gap-2">
          <Choice active={payment === "mpesa"} onClick={() => setPayment("mpesa")} icon={<Smartphone className="size-5" />} label="M-Pesa" sub="Mobile" />
          <Choice active={payment === "cash"} onClick={() => setPayment("cash")} icon={<Banknote className="size-5" />} label="Cash" sub="On delivery" />
          <Choice active={payment === "card"} onClick={() => setPayment("card")} icon={<CreditCard className="size-5" />} label="Card" sub="On delivery" />
        </div>
      </section>

      <section className="px-4 mt-6 mx-auto max-w-md">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Your details</div>
        <div className="mt-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" type="tel" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else? (gate, time window, etc.)" rows={2} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>
      </section>

      <section className="px-4 mt-6 mx-auto max-w-md">
        <div className="glass rounded-2xl p-4 space-y-1.5 text-sm">
          <Row label="Subtotal" value={`KSh ${subtotal}`} />
          <Row label={deliveryFee === 0 && deliveryType === "delivery" ? "Delivery (free)" : "Delivery"} value={`KSh ${deliveryFee}`} />
          <div className="h-px bg-border my-1" />
          <Row label="Total" value={`KSh ${total}`} bold />
        </div>
      </section>

      <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <div className="mx-auto max-w-md">
          <Magnetic as="div" className="w-full">
            <button
              onClick={submit}
              disabled={submitting || cs.items.length === 0}
              className="w-full gradient-hero text-primary-foreground font-bold py-4 rounded-2xl shadow-glow disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? "Placing…" : <>Place order · KSh {total} <Check className="size-4" /></>}
            </button>
          </Magnetic>
        </div>
      </div>
    </main>
  );
}

function QtyControl({ qty, onAdd, onSub }: { qty: number; onAdd: () => void; onSub: () => void }) {
  if (qty === 0) return <button onClick={onAdd} className="px-3 py-2 rounded-full gradient-aqua text-primary-foreground text-xs font-bold">Add</button>;
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-full p-1">
      <button onClick={onSub} className="size-7 rounded-full bg-card grid place-items-center"><Minus className="size-3" /></button>
      <span className="w-6 text-center text-sm font-bold">{qty}</span>
      <button onClick={onAdd} className="size-7 rounded-full gradient-aqua text-primary-foreground grid place-items-center"><Plus className="size-3" /></button>
    </div>
  );
}

function Choice({ active, onClick, icon, label, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`rounded-2xl p-3 text-left border transition-all ${active ? "border-primary bg-primary/10 shadow-soft" : "border-border bg-card"}`}
    >
      <div className={`size-9 rounded-xl grid place-items-center ${active ? "gradient-aqua text-primary-foreground" : "bg-secondary"}`}>{icon}</div>
      <div className="font-bold text-sm mt-2">{label}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </motion.button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-extrabold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
