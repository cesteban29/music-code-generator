import './globals.css';

export const metadata = {
  title: 'Prompt → Music',
  description: 'Turn emotions into music with AI',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-te-black text-te-white font-mono">
        {children}
      </body>
    </html>
  )
}
