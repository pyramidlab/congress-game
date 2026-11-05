import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Congress Game — Every voice. Every round.",
  description: "Live quizzes and surveys that bring your congress together.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
