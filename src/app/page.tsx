import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Institucional from './institucional';

export const metadata = {
  title: 'Watt Consultoria',
  description:
    'A Watt Consultoria é uma empresa especializada em soluções de energia solar, oferecendo serviços de consultoria, projetos personalizados e suporte técnico para clientes residenciais, comerciais e industriais. Nossa missão é ajudar nossos clientes a economizar energia e reduzir custos, promovendo a sustentabilidade e o uso eficiente dos recursos naturais.'
};

async function App() {
  const headersList = await headers();
  const currentHost = (
    headersList.get('x-forwarded-host') ??
    headersList.get('host') ??
    ''
  ).split(':')[0];

  // Verifica se o usuario acessou pelo subdominio
  if (currentHost === 'dashboard.wattconsultoria.com.br') {
    redirect('/dashboard/individual');
  }

  // Comportamento padrao: Site Institucional
  return <Institucional />;
}

export default App;
