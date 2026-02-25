import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PSeletivoMembroPage() {
  const isTestEnvironment = process.env.NODE_ENV !== 'production';

  return (
    <PageContainer
      pageTitle='Membro PSeletivo'
      pageDescription='Area dedicada ao membro do processo seletivo'
      access={isTestEnvironment}
      accessFallback={
        <div className='text-muted-foreground text-center text-sm'>
          Esta tela esta disponivel apenas no ambiente de testes.
        </div>
      }
    >
      <div className='flex flex-1 flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Tela em construcao</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-sm'>
              Esta pagina foi criada para o fluxo de membro do processo
              seletivo. Nas proximas etapas, podemos adicionar dados de perfil,
              etapas, tarefas e status.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
