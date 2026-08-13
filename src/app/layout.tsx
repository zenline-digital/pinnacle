import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PINNACLE — Your finances. Your goals. Your life.',
  description: 'Personal finance intelligence and life goal platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0f', color: 'white', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
