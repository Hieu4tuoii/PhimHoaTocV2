import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'PhimHoaToc - Website Xem Phim Cao Cấp Trực Tuyến Hàng Đầu',
  description: 'Trang web xem phim trực tuyến miễn phí, chất lượng cao HD Vietsub. Cập nhật nhanh nhất các bộ phim lẻ, phim bộ, hoạt hình anime, và TV shows mới nhất.',
  keywords: 'xem phim, phim online, phim vietsub, phim hot, phim hay, phimhoatoc, phim thuyet minh',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${outfit.variable} h-full antialiased`}>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e50914" />
      </head>
      <body className="min-h-full flex flex-col bg-navy-dark text-slate-100 font-sans">
        <AppProvider>
          <Header />
          <main className="flex-1 w-full relative z-10">
            {children}
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
