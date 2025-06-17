import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Flyadeal Intranet',
  description: 'Internal portal for Flyadeal employees',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-raleway min-h-screen bg-gradient-to-br from-flyadeal-purple via-flyadeal-dark-blue to-flyadeal-light-blue">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}