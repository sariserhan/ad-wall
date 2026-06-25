"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "info" | "error";
type ToastFn = (msg: string, type?: ToastType) => void;

let _handler: ToastFn = () => {};

export function toast(msg: string, type: ToastType = "success") {
  _handler(msg, type);
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string; type: ToastType }[]>([]);

  useEffect(() => {
    _handler = (msg, type = "success") => {
      const id = Date.now() + Math.random();
      setItems((v) => [...v, { id, msg, type }]);
      setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 2400);
    };
    return () => {
      _handler = () => {};
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.type}`} role="status">
          {item.msg}
        </div>
      ))}
    </div>
  );
}
