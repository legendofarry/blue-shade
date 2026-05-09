import { useEffect, useRef } from "react";

/** Lightweight WebGL fallback: animated SVG water canvas with cloth-like blobs.
 *  Mobile-friendly. No three.js. Pure GPU-accelerated SVG + filters. */
export function WaterCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const blobs = ref.current?.querySelectorAll<SVGPathElement>("path[data-blob]") ?? [];
    const tick = () => {
      t += 0.008;
      blobs.forEach((b, i) => {
        const o = i * 1.7;
        const x = Math.sin(t + o) * 6;
        const y = Math.cos(t * 0.8 + o) * 5;
        b.setAttribute("transform", `translate(${x} ${y})`);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg ref={ref} viewBox="0 0 400 400" className={className} aria-hidden>
      <defs>
        <radialGradient id="g1" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="oklch(0.92 0.08 200)" />
          <stop offset="60%" stopColor="oklch(0.62 0.16 220)" />
          <stop offset="100%" stopColor="oklch(0.32 0.13 248)" />
        </radialGradient>
        <filter id="goo">
          <feGaussianBlur stdDeviation="14" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
        </filter>
      </defs>
      <g filter="url(#goo)">
        <path data-blob d="M200 120 a90 90 0 1 1 0.1 0z" fill="url(#g1)" opacity="0.95" />
        <path data-blob d="M120 230 a55 55 0 1 1 0.1 0z" fill="oklch(0.78 0.14 200)" opacity="0.85" />
        <path data-blob d="M280 250 a48 48 0 1 1 0.1 0z" fill="oklch(0.55 0.18 235)" opacity="0.85" />
        <path data-blob d="M210 310 a38 38 0 1 1 0.1 0z" fill="oklch(0.7 0.15 215)" opacity="0.85" />
      </g>
    </svg>
  );
}
