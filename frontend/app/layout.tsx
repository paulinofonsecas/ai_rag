import type { Metadata } from 'next';
import { DM_Sans, Space_Grotesk } from 'next/font/google';

import './globals.css';

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-title',
});

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
        <html lang="pt-BR">
            <body className={`${dmSans.variable} ${spaceGrotesk.variable}`}>{children}</body>
        </html>
    );
}
