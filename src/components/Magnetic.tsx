import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number;
  as?: "button" | "div";
}

export function Magnetic({ children, className, onClick, strength = 0.35, as = "button" }: MagneticProps) {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });
  const rotX = useTransform(sy, [-40, 40], [8, -8]);
  const rotY = useTransform(sx, [-40, 40], [-8, 8]);

  const handleMove = (e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  const Comp: any = motion[as];
  return (
    <Comp
      ref={ref as any}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy, rotateX: rotX, rotateY: rotY, transformPerspective: 600 }}
      className={cn("inline-flex items-center justify-center will-change-transform", className)}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </Comp>
  );
}
