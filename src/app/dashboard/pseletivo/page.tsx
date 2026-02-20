'use client';

import * as React from 'react';
import Image from 'next/image';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import useMetadata from '@/hooks/use-metadata';

type CandidateTaskStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

type CandidateTask = {
  id: string;
  titulo: string;
  status: CandidateTaskStatus;
};

type Candidate = {
  id: string;
  nome: string;
  sobrenome: string;
  curso: string;
  periodo: string;
  etapa: string;
  telefone: string;
  email: string;
  instagram: string;
  origemPsel: string;
  oQueMove: string;
  porqueWatt: string;
  tamanhoCamisa: string;
  curriculumVitaeUrl: string;
  historicoEscolarUrl: string;
  imagemUrl: string;
  tarefas: CandidateTask[];
};

const members: Candidate[] = [
  {
    id: 'cand-001',
    nome: 'Marina',
    sobrenome: 'Alves',
    curso: 'Engenharia Eletrica',
    periodo: '5',
    etapa: 'Inscricao',
    telefone: '(31) 99877-1234',
    email: 'marina.alves@gmail.com',
    instagram: '@marialves.dev',
    origemPsel: 'Indicacao de um membro da WATT',
    oQueMove: 'Criar impacto pratico com energia e tecnologia.',
    porqueWatt: 'Aplicar conhecimento em projetos reais e evoluir em equipe.',
    tamanhoCamisa: 'M',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-marina.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-marina.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/1.png',
    tarefas: [
      { id: 'task-001', titulo: 'Conferir formulario', status: 'CONCLUIDA' },
      { id: 'task-002', titulo: 'Validar contato', status: 'EM_ANDAMENTO' },
      { id: 'task-003', titulo: 'Triagem inicial', status: 'PENDENTE' }
    ]
  },
  {
    id: 'cand-002',
    nome: 'Lucas',
    sobrenome: 'Pereira',
    curso: 'Engenharia de Computacao',
    periodo: '3',
    etapa: 'Triagem',
    telefone: '(11) 97755-9087',
    email: 'lucaspereira@outlook.com',
    instagram: '@lks.pereira',
    origemPsel: 'Instagram da WATT',
    oQueMove: 'Aprender rapido e construir produtos.',
    porqueWatt: 'Projetos desafiadores com aprendizado intenso.',
    tamanhoCamisa: 'G',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-lucas.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-lucas.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/2.png',
    tarefas: [
      { id: 'task-004', titulo: 'Analisar CV', status: 'EM_ANDAMENTO' },
      { id: 'task-005', titulo: 'Analisar historico', status: 'PENDENTE' },
      { id: 'task-006', titulo: 'Registrar feedback', status: 'PENDENTE' }
    ]
  },
  {
    id: 'cand-003',
    nome: 'Bruna',
    sobrenome: 'Silva',
    curso: 'Engenharia de Producao',
    periodo: '7',
    etapa: 'Entrevista',
    telefone: '(21) 99661-4500',
    email: 'bruna.silva@gmail.com',
    instagram: '@bruna.sv',
    origemPsel: 'Evento da universidade',
    oQueMove: 'Resolver problemas com foco em resultado.',
    porqueWatt: 'Unir tecnica e gestao em consultoria.',
    tamanhoCamisa: 'P',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-bruna.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-bruna.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/3.png',
    tarefas: [
      { id: 'task-007', titulo: 'Agendar entrevista', status: 'CONCLUIDA' },
      { id: 'task-008', titulo: 'Coletar pareceres', status: 'EM_ANDAMENTO' },
      { id: 'task-009', titulo: 'Consolidar nota', status: 'PENDENTE' }
    ]
  },
  {
    id: 'cand-004',
    nome: 'Rafael',
    sobrenome: 'Santos',
    curso: 'Engenharia Mecanica',
    periodo: '6',
    etapa: 'Resultado',
    telefone: '(41) 98811-3344',
    email: 'rafael.santos@hotmail.com',
    instagram: '@rafa.santos',
    origemPsel: 'Site oficial da WATT',
    oQueMove: 'Evoluir com desafios praticos e colaboracao.',
    porqueWatt: 'Aprender com projetos reais e ritmo de consultoria.',
    tamanhoCamisa: 'M',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-rafael.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-rafael.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/4.png',
    tarefas: [
      { id: 'task-010', titulo: 'Validar documentacao', status: 'CONCLUIDA' },
      {
        id: 'task-011',
        titulo: 'Enviar retorno oficial',
        status: 'EM_ANDAMENTO'
      },
      { id: 'task-012', titulo: 'Registrar onboarding', status: 'PENDENTE' }
    ]
  },
  {
    id: 'cand-005',
    nome: 'Ana',
    sobrenome: 'Costa',
    curso: 'Administracao',
    periodo: '4',
    etapa: 'Triagem',
    telefone: '(71) 99114-2233',
    email: 'ana.costa@gmail.com',
    instagram: '@anacostaa',
    origemPsel: 'Indicacao de ex-membro',
    oQueMove: 'Organizar processos e gerar resultado mensuravel.',
    porqueWatt: 'Atuar em projetos de impacto com time multidisciplinar.',
    tamanhoCamisa: 'P',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-ana.pdf',
    historicoEscolarUrl: 'https://storage.googleapis.com/mock-watt/historico-ana.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/5.png',
    tarefas: [
      { id: 'task-013', titulo: 'Revisar formulario', status: 'CONCLUIDA' },
      { id: 'task-014', titulo: 'Checar disponibilidade', status: 'PENDENTE' },
      { id: 'task-015', titulo: 'Agendar entrevista RH', status: 'PENDENTE' }
    ]
  },
  {
    id: 'cand-006',
    nome: 'Pedro',
    sobrenome: 'Lima',
    curso: 'Ciencia da Computacao',
    periodo: '2',
    etapa: 'Inscricao',
    telefone: '(85) 99773-1144',
    email: 'pedrolima@outlook.com',
    instagram: '@pedrol.dev',
    origemPsel: 'Palestra na universidade',
    oQueMove: 'Resolver problemas complexos com tecnologia.',
    porqueWatt: 'Buscar crescimento tecnico e experiencia pratica.',
    tamanhoCamisa: 'G',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-pedro.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-pedro.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/6.png',
    tarefas: [
      { id: 'task-016', titulo: 'Confirmar inscricao', status: 'CONCLUIDA' },
      { id: 'task-017', titulo: 'Validar email', status: 'EM_ANDAMENTO' },
      { id: 'task-018', titulo: 'Criar ficha de avaliacao', status: 'PENDENTE' }
    ]
  },
  {
    id: 'cand-007',
    nome: 'Julia',
    sobrenome: 'Rocha',
    curso: 'Engenharia Civil',
    periodo: '8',
    etapa: 'Entrevista',
    telefone: '(61) 99220-5544',
    email: 'juliarocha@gmail.com',
    instagram: '@ju.rocha',
    origemPsel: 'Instagram da WATT',
    oQueMove: 'Liderar equipes e transformar planejamento em execucao.',
    porqueWatt: 'Desenvolver visao de negocio e gestao de projetos.',
    tamanhoCamisa: 'M',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-julia.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-julia.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/7.png',
    tarefas: [
      {
        id: 'task-019',
        titulo: 'Marcar banca tecnica',
        status: 'EM_ANDAMENTO'
      },
      { id: 'task-020', titulo: 'Enviar case', status: 'CONCLUIDA' },
      {
        id: 'task-021',
        titulo: 'Consolidar feedback final',
        status: 'PENDENTE'
      }
    ]
  },
  {
    id: 'cand-008',
    nome: 'Mateus',
    sobrenome: 'Oliveira',
    curso: 'Engenharia de Producao',
    periodo: '5',
    etapa: 'Triagem',
    telefone: '(27) 99881-6622',
    email: 'mateus.oliveira@gmail.com',
    instagram: '@mateus.prod',
    origemPsel: 'Feira de recrutamento',
    oQueMove: 'Melhoria continua e eficiencia operacional.',
    porqueWatt: 'Aplicar metodo e analise em desafios reais.',
    tamanhoCamisa: 'G',
    curriculumVitaeUrl: 'https://storage.googleapis.com/mock-watt/cv-mateus.pdf',
    historicoEscolarUrl:
      'https://storage.googleapis.com/mock-watt/historico-mateus.pdf',
    imagemUrl: 'https://api.slingacademy.com/public/sample-users/8.png',
    tarefas: [
      {
        id: 'task-022',
        titulo: 'Avaliar perfil academico',
        status: 'EM_ANDAMENTO'
      },
      { id: 'task-023', titulo: 'Contato inicial', status: 'CONCLUIDA' },
      {
        id: 'task-024',
        titulo: 'Definir entrevistadores',
        status: 'PENDENTE'
      }
    ]
  }
];

const taskStatusLabel: Record<CandidateTaskStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluida'
};

const taskStatusVariant: Record<
  CandidateTaskStatus,
  'secondary' | 'outline' | 'default'
> = {
  PENDENTE: 'secondary',
  EM_ANDAMENTO: 'outline',
  CONCLUIDA: 'default'
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function CandidateField({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground text-xs font-medium'>{label}</p>
      <p className='text-sm leading-snug'>{value}</p>
    </div>
  );
}

export default function PSeletivoPage() {
  useMetadata({ title: 'PSeletivo' });

  const [query, setQuery] = React.useState('');

  const normalizedQuery = normalizeText(query.trim());

  const filteredMembers = React.useMemo(() => {
    if (!normalizedQuery) return members;

    return members.filter((member) => {
      const fullName = `${member.nome} ${member.sobrenome}`;
      return [fullName, member.curso].some((field) =>
        normalizeText(field).includes(normalizedQuery)
      );
    });
  }, [normalizedQuery]);

  return (
    <PageContainer
      pageTitle='PSeletivo'
      pageDescription='Novos membros do processo seletivo'
      scrollable={false}
    >
      <div className='flex h-full min-h-0 min-w-0 flex-col gap-3'>
        <div className='bg-muted/20 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm font-semibold'>
            Total de membros: {filteredMembers.length}
          </p>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar por nome ou curso...'
            className='w-full sm:w-72'
          />
        </div>

        <div className='flex min-h-0 flex-1 w-full max-w-full overflow-hidden rounded-md'>
          <div className='h-full w-full max-w-full overflow-x-auto overflow-y-hidden touch-pan-x snap-x snap-mandatory'>
            <div className='flex h-full w-max items-stretch gap-3 p-3'>
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className='flex h-full min-h-0 w-[66.666vw] min-w-[240px] shrink-0 snap-start flex-col overflow-hidden whitespace-normal sm:w-[320px]'
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <CardTitle className='truncate text-base'>
                          {member.nome} {member.sobrenome}
                        </CardTitle>
                        <p className='text-muted-foreground text-xs'>
                          {member.curso} | {member.periodo} periodo
                        </p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-7 w-7 rounded-full'
                            aria-label={`Abrir detalhes de ${member.nome} ${member.sobrenome}`}
                          >
                            i
                          </Button>
                        </DialogTrigger>
                        <DialogContent className='max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg'>
                          <DialogHeader>
                            <DialogTitle>
                              {member.nome} {member.sobrenome}
                            </DialogTitle>
                            <DialogDescription>
                              Detalhes completos do candidato.
                            </DialogDescription>
                          </DialogHeader>
                          <div className='space-y-3'>
                            <CandidateField label='Nome' value={member.nome} />
                            <CandidateField label='Sobrenome' value={member.sobrenome} />
                            <CandidateField label='Curso' value={member.curso} />
                            <CandidateField label='Periodo' value={member.periodo} />
                            <CandidateField label='Etapa' value={member.etapa} />
                            <CandidateField
                              label='Tamanho da camisa'
                              value={member.tamanhoCamisa}
                            />
                            <CandidateField
                              label='Por onde voce ficou sabendo do PSEL?'
                              value={member.origemPsel}
                            />
                            <CandidateField
                              label='Telefone para contato'
                              value={member.telefone}
                            />
                            <CandidateField
                              label='E-mail para contato'
                              value={member.email}
                            />
                            <CandidateField
                              label='Qual o seu instagram'
                              value={member.instagram}
                            />
                            <CandidateField label='O que te move' value={member.oQueMove} />
                            <CandidateField
                              label='Por que voce gostaria de entrar na WATT?'
                              value={member.porqueWatt}
                            />
                            <div className='space-y-1'>
                              <p className='text-muted-foreground text-xs font-medium'>
                                Documentos
                              </p>
                              <a
                                href={member.curriculumVitaeUrl}
                                target='_blank'
                                rel='noreferrer'
                                className='text-primary block text-sm hover:underline'
                              >
                                Curriculum Vitae
                              </a>
                              <a
                                href={member.historicoEscolarUrl}
                                target='_blank'
                                rel='noreferrer'
                                className='text-primary block text-sm hover:underline'
                              >
                                Historico escolar
                              </a>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className='overflow-hidden rounded-md border'>
                      <Image
                        src={member.imagemUrl}
                        alt={`Imagem do candidato ${member.nome} ${member.sobrenome}`}
                        className='h-40 w-full object-cover'
                        width={320}
                        height={220}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className='flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden'>
                    <p className='text-muted-foreground text-xs font-medium'>
                      Tarefas relacionadas
                    </p>
                    <ScrollArea className='h-full min-h-0 flex-1 touch-pan-y'>
                      <ul className='space-y-2 pr-2'>
                        {member.tarefas.map((task) => (
                          <li key={task.id} className='rounded-md border p-2'>
                            <div className='flex items-center justify-between gap-2'>
                              <p className='text-sm font-medium'>{task.titulo}</p>
                              <Badge variant={taskStatusVariant[task.status]}>
                                {taskStatusLabel[task.status]}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}

              {filteredMembers.length === 0 ? (
                <Card className='flex h-full min-h-0 w-[66.666vw] min-w-[240px] shrink-0 snap-start items-center justify-center overflow-hidden border-dashed sm:w-[320px]'>
                  <CardContent className='text-muted-foreground py-8 text-center text-sm'>
                    Nenhum membro encontrado.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
