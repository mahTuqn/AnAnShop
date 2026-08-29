import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["vietnamese"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["vietnamese"], variable: "--font-lora", display: "swap" });

export const metadata: Metadata = {
  title: { default: "An An — Dịu dàng cùng mẹ và bé", template: "%s | An An" },
  description: "Thời trang mẹ bầu, sau sinh và trẻ sơ sinh với chất liệu an toàn, nguồn gốc rõ ràng.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={`${inter.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
