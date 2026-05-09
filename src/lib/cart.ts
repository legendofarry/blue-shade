import { useSyncExternalStore } from "react";

export type CartItem = { product_id: string; name: string; price: number; size_liters: number; kind: string; qty: number };

let listeners: Array<() => void> = [];
let state = { items: [] as CartItem[] };
const emit = () => { state = { items: [...state.items] }; listeners.forEach(l => l()); };

export const cart = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.push(l); return () => { listeners = listeners.filter(x => x !== l); }; },
  add: (i: CartItem) => {
    const existing = state.items.find(x => x.product_id === i.product_id);
    if (existing) existing.qty += i.qty; else state.items.push(i);
    emit();
  },
  setQty: (id: string, qty: number) => {
    state.items = state.items.map(x => x.product_id === id ? { ...x, qty: Math.max(0, qty) } : x).filter(x => x.qty > 0);
    emit();
  },
  remove: (id: string) => { state.items = state.items.filter(x => x.product_id !== id); emit(); },
  clear: () => { state.items = []; emit(); },
  count: () => state.items.reduce((a, b) => a + b.qty, 0),
  total: () => state.items.reduce((a, b) => a + b.qty * b.price, 0),
};

export function useCart() {
  return useSyncExternalStore(cart.subscribe, cart.get, cart.get);
}
