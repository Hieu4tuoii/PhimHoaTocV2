import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Phim Hỏa Tốc - Website Xem Phim Cao Cấp Trực Tuyến Hàng Đầu',
  description: 'Trang web xem phim trực tuyến miễn phí, chất lượng cao HD Vietsub. Cập nhật nhanh nhất các bộ phim lẻ, phim bộ, hoạt hình anime, và TV shows mới nhất.',
  keywords: 'xem phim, phim online, phim vietsub, phim hot, phim hay, phim hoa toc, phim hoatoc, phim thuyet minh',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${outfit.variable} h-full antialiased`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e50914" />
      </head>
      <body className="min-h-full flex flex-col bg-navy-dark text-slate-100 font-sans">
        <AppProvider>
          <Header />
          <main className="flex-1 w-full relative z-10 outline-none pb-16 lg:pb-0">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
