"use client";
import { motion } from "framer-motion";

export function Button({ children, variant = "primary", size = "lg", className = "", ...props }: { children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg"; className?: string; [key: string]: any }) {
  const variants = {
    primary: "bg-sage-300/80 hover:bg-sage-300 text-text-primary",
    secondary: "bg-white/50 hover:bg-white/70 text-text-secondary",
    ghost: "bg-transparent hover:bg-white/30 text-text-secondary",
  };
  const sizes = {
    sm: "px-6 py-2 text-sm",
    md: "px-8 py-3 text-base",
    lg: "px-10 py-3.5 text-base",
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-button backdrop-blur-xl border border-white/30 font-medium transition-all duration-300 hover:shadow-[0_8px_25px_rgba(168,181,162,0.15)] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
