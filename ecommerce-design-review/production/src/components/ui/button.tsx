import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const styles = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c26b77] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "text" }) {
  const variants = { primary: "bg-[#ce7a85] text-white hover:bg-[#563029]", secondary: "border border-[#ce7a85] text-[#ce7a85] hover:bg-[#fcf4f5] bg-transparent", text: "px-0 text-[#ce7a85] underline-offset-4 hover:underline bg-transparent" };
  return <button className={`${styles} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "text"; className?: string }) {
  const variants = { primary: "bg-[#ce7a85] text-white hover:bg-[#563029]", secondary: "border border-[#ce7a85] text-[#ce7a85] hover:bg-[#fcf4f5]", text: "px-0 text-[#ce7a85] underline-offset-4 hover:underline" };
  return <Link href={href} className={`${styles} ${variants[variant]} ${className}`}>{children}</Link>;
}
