import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Traitors AI',
  description: 'A social deduction game with AI players',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
