import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Institucional from './institucional';

async function App() {
  const headersList = await headers();
  const currentHost = (
    headersList.get('x-forwarded-host') ?? headersList.get('host') ?? ''
  ).split(':')[0];

  // Verifica se o usuario acessou pelo subdominio
  if (currentHost === 'dashboard.wattconsultoria.com.br') {
    redirect('/dashboard/individual');
  }

  // Comportamento padrao: Site Institucional
  return <Institucional />;
}

export default App;
