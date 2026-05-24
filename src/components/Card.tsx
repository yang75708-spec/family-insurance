"use client";
import { motion } from "framer-motion";

export function Card({ children, className = "", hover = true, delay = 0, ...props }: { children: React.ReactNode; className?: string; hover?: boolean; delay?: number; [key: string]: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={hover ? { y: -2 } : {}}
      className={`rounded-card p-8 glass shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
