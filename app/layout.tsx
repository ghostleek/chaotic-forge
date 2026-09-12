import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mechanic Forge — Compose playable rules',
  description: 'A visual node engine for composing, testing, and explaining game mechanics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
