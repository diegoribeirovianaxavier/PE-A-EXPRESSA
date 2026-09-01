import type { Metadata } from 'next';
import './globals.css';
import AntdProvider from '@/components/theme/AntdProvider';

export const metadata: Metadata = {
  title: 'PEÇA EXPRESSA | ERP & Dashboard Financeiro',
  description: 'Sistema de Gestão de Vendas, OCR de Notas Fiscais, Precificação Inteligente e Controle de Garantias para Autopeças.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
