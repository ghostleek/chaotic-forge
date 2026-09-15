import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mechanic Forge — Find patterns worth testing',
  description:
    'Find sourced game-mechanic patterns, understand their trade-offs, and choose the smallest credible test.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
