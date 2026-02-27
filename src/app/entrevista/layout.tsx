import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agendamento de Entrevista — Watt Consultoria Jr.',
  description:
    'Escolha o melhor horário para a sua entrevista no Processo Seletivo da Watt Consultoria Jr.',
  robots: 'noindex, nofollow'
};

export default function InterviewLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
