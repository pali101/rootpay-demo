import type { Metadata } from 'next'
import { IBM_Plex_Mono, Syne, DM_Sans } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RootPay - Merkle-Indexed Micropayment Channels',
  description: 'One root. Thousands of payments. One settlement.',
  openGraph: {
    title: 'RootPay',
    description: 'Merkle-indexed micropayment channels on Filecoin',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMono.variable} ${syne.variable} ${dmSans.variable}`}
    >
      <body className="bg-[#0A0B0D] text-[#E8E6DF] font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
