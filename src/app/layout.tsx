import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'REMINDO — Personal AI Reminder Assistant',
  description: 'Remember Less. Get More Done. Smart natural language and voice-enabled personal productivity assistant.',
  keywords: ['reminder', 'AI assistant', 'voice task capture', 'productivity', 'todo', 'smart deadlines'],
  authors: [{ name: 'Remindo Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
