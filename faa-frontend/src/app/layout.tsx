import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Navbar } from '@/components/Navbar';

const appDescription = 'FAA A&P exam preparation for General, Airframe, and Powerplant. Practice by subject, take randomized written exams, rehearse oral DME questions, track progress, and manage your subscription.';

export const metadata: Metadata = {
  title: {
    default: 'SkyMentor | FAA A&P Exam Trainer',
    template: '%s | SkyMentor',
  },
  applicationName: 'SkyApp',
  description: appDescription,
  keywords: [
    'FAA A&P exam',
    'A&P practice test',
    'airframe exam prep',
    'powerplant exam prep',
    'FAA oral exam practice',
    'DME oral questions',
    'aviation maintenance technician',
    'AMT certification',
  ],
  category: 'education',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: '/brand/logo_1.png', sizes: '6250x6250', type: 'image/png' }],
    shortcut: ['/brand/logo_1.png'],
    apple: [{ url: '/brand/logo_1.png', sizes: '6250x6250', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'SkyApp',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'SkyMentor | FAA A&P Exam Trainer',
    description: appDescription,
    siteName: 'SkyMentor',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'SkyMentor | FAA A&P Exam Trainer',
    description: appDescription,
  },
};

export const viewport: Viewport = {
  themeColor: '#071827',
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/airplane-bg.jpg" alt="" className="page-bg-airplane" aria-hidden="true" />
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              <Navbar />
              <main className="app-main mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
            </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
