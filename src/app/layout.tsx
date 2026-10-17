import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import '../styles/index.css';

export const metadata: Metadata = {
  title: 'Daily Visitor',
  description: 'Visitor and resident service management portal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
