import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

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
        <nav
          aria-label="Creator access"
          style={{ padding: '10px 20px', display: 'flex', gap: 20 }}
        >
          <Link href="/explore">Mechanic lab</Link>
          <Link href="/forge/create">Sign in / API access</Link>
          <Link href="/play/snake-space-invaders">
            Free Snake × Invaders demo
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
