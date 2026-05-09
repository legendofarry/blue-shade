import { motion } from "framer-motion";

/** Stylized bottle SVG with internal water that wobbles via spring. */
export function Bottle({ size = 1, fill = 0.7, label }: { size?: number; fill?: number; label?: string }) {
  const h = 220 * size;
  const w = 110 * size;
  const waterY = 60 + (1 - fill) * 110;
  return (
    <motion.svg
      width={w}
      height={h}
      viewBox="0 0 110 220"
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ rotate: -3 }}
      transition={{ type: "spring", stiffness: 120, damping: 12 }}
    >
      <defs>
        <linearGradient id={`bot-${label}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.92 0.06 205)" />
          <stop offset="60%" stopColor="oklch(0.7 0.13 215)" />
          <stop offset="100%" stopColor="oklch(0.45 0.16 235)" />
        </linearGradient>
        <clipPath id={`clip-${label}`}>
          <path d="M30 50 Q30 40 40 40 H70 Q80 40 80 50 V70 Q95 80 95 100 V190 Q95 210 75 210 H35 Q15 210 15 190 V100 Q15 80 30 70 Z" />
        </clipPath>
      </defs>
      {/* Cap */}
      <rect x="40" y="20" width="30" height="22" rx="4" fill="oklch(0.55 0.17 230)" />
      {/* Bottle body */}
      <path
        d="M30 50 Q30 40 40 40 H70 Q80 40 80 50 V70 Q95 80 95 100 V190 Q95 210 75 210 H35 Q15 210 15 190 V100 Q15 80 30 70 Z"
        fill="oklch(1 0 0 / 0.35)"
        stroke="oklch(0.6 0.1 220 / 0.3)"
      />
      {/* Water */}
      <g clipPath={`url(#clip-${label})`}>
        <motion.rect
          x="0"
          y={waterY}
          width="110"
          height="220"
          fill={`url(#bot-${label})`}
          animate={{ y: [waterY, waterY - 3, waterY] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        />
        {/* surface highlight */}
        <motion.path
          d={`M0 ${waterY} Q30 ${waterY - 6} 55 ${waterY} T110 ${waterY} V${waterY + 4} H0 Z`}
          fill="oklch(1 0 0 / 0.6)"
          animate={{ x: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
        />
      </g>
      {/* Label */}
      {label && (
        <g>
          <rect x="22" y="120" width="66" height="40" rx="6" fill="white" opacity="0.9" />
          <text x="55" y="145" textAnchor="middle" fontSize="18" fontWeight="800" fill="oklch(0.32 0.13 248)" fontFamily="Montserrat">
            {label}
          </text>
        </g>
      )}
    </motion.svg>
  );
}
