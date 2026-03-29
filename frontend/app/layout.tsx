import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
    title: 'Hybrid Search Console',
    description: 'Console web para ingestao e busca hibrida de produtos',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
            <body>{children}</body>
        </html>
    );
}
