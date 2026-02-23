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
import {
  getExternalFormResponses,
  listExternalPselForms,
  type StoredForm,
  type StoredFormResponse
} from '@/lib/firestore/forms';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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
  informacoesAdicionais: Array<{
    titulo: string;
    valor: string;
  }>;
};

const fallbackImageUrls = [
  'https://api.slingacademy.com/public/sample-users/1.png',
  'https://api.slingacademy.com/public/sample-users/2.png',
  'https://api.slingacademy.com/public/sample-users/3.png',
  'https://api.slingacademy.com/public/sample-users/4.png',
  'https://api.slingacademy.com/public/sample-users/5.png',
  'https://api.slingacademy.com/public/sample-users/6.png',
  'https://api.slingacademy.com/public/sample-users/7.png',
  'https://api.slingacademy.com/public/sample-users/8.png'
];

const candidateFieldAliases = {
  nome: ['nome'],
  sobrenome: ['sobrenome'],
  curso: ['curso'],
  periodo: ['periodo'],
  etapa: ['etapa'],
  telefone: ['telefone', 'telefone para contato', 'celular', 'whatsapp'],
  email: ['email', 'e-mail', 'email para contato'],
  instagram: ['instagram', 'qual o seu instagram'],
  origemPsel: ['por onde voce ficou sabendo do psel', 'origem psel', 'origem'],
  oQueMove: ['o que te move', 'oque te move'],
  porqueWatt: [
    'por que voce gostaria de entrar na watt',
    'porque voce gostaria de entrar na watt',
    'por que watt',
    'porque watt'
  ],
  tamanhoCamisa: ['tamanho da camisa', 'tamanho camisa'],
  curriculumVitaeUrl: [
    'curriculum vitae',
    'curriculo',
    'curriculo vitae',
    'curriculum vitae url'
  ],
  historicoEscolarUrl: [
    'historico escolar',
    'historico',
    'historico escolar url'
  ],
  imagemUrl: ['imagem', 'foto', 'imagem url', 'foto do candidato']
} as const;

const baseAliasKeys = new Set(
  Object.values(candidateFieldAliases)
    .flat()
    .map((alias) => normalizeFieldKey(alias))
);

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

function normalizeFieldKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function getFieldValue(
  values: Map<string, string>,
  aliases: readonly string[],
  fallback = 'Nao informado'
) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeFieldKey(alias);
    const value = values.get(normalizedAlias);
    if (value) {
      return value;
    }
  }

  return fallback;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function mapResponseToCandidate(
  response: StoredFormResponse,
  index: number
): Candidate {
  const valuesByField = new Map<string, string>();

  for (const answer of response.respostas ?? []) {
    const fieldKey = normalizeFieldKey(answer.tituloPergunta ?? '');
    const value = (answer.valor ?? '').trim();
    if (!fieldKey || !value) continue;
    if (!valuesByField.has(fieldKey)) {
      valuesByField.set(fieldKey, value);
    }
  }

  const informacoesAdicionaisArray = (response.respostas ?? [])
    .filter((answer) => {
      const titulo = answer.tituloPergunta ?? '';
      const valor = (answer.valor ?? '').trim();
      if (!titulo || !valor) return false;
      return !baseAliasKeys.has(normalizeFieldKey(titulo));
    })
    .map((answer) => ({
      titulo: answer.tituloPergunta,
      valor: answer.valor.trim()
    }));

  const imagemInformada = getFieldValue(valuesByField, candidateFieldAliases.imagemUrl, '');
  const imagemUrl = isHttpUrl(imagemInformada)
    ? imagemInformada
    : fallbackImageUrls[index % fallbackImageUrls.length];

  const curriculumInformado = getFieldValue(
    valuesByField,
    candidateFieldAliases.curriculumVitaeUrl,
    ''
  );
  const historicoInformado = getFieldValue(
    valuesByField,
    candidateFieldAliases.historicoEscolarUrl,
    ''
  );

  return {
    id: response.id,
    nome: getFieldValue(valuesByField, candidateFieldAliases.nome),
    sobrenome: getFieldValue(valuesByField, candidateFieldAliases.sobrenome),
    curso: getFieldValue(valuesByField, candidateFieldAliases.curso),
    periodo: getFieldValue(valuesByField, candidateFieldAliases.periodo),
    etapa: getFieldValue(valuesByField, candidateFieldAliases.etapa, 'Inscricao'),
    telefone: getFieldValue(valuesByField, candidateFieldAliases.telefone),
    email: getFieldValue(valuesByField, candidateFieldAliases.email),
    instagram: getFieldValue(valuesByField, candidateFieldAliases.instagram),
    origemPsel: getFieldValue(valuesByField, candidateFieldAliases.origemPsel),
    oQueMove: getFieldValue(valuesByField, candidateFieldAliases.oQueMove),
    porqueWatt: getFieldValue(valuesByField, candidateFieldAliases.porqueWatt),
    tamanhoCamisa: getFieldValue(valuesByField, candidateFieldAliases.tamanhoCamisa),
    curriculumVitaeUrl: isHttpUrl(curriculumInformado) ? curriculumInformado : '#',
    historicoEscolarUrl: isHttpUrl(historicoInformado) ? historicoInformado : '#',
    imagemUrl,
    tarefas: [],
    informacoesAdicionais: informacoesAdicionaisArray
  };
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

  const [pselForms, setPselForms] = React.useState<StoredForm[]>([]);
  const [selectedFormId, setSelectedFormId] = React.useState('');
  const [members, setMembers] = React.useState<Candidate[]>([]);
  const [query, setQuery] = React.useState('');
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
  const [isLoadingForms, setIsLoadingForms] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [copyMessage, setCopyMessage] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;

    async function loadForms() {
      try {
        setIsLoadingForms(true);
        setLoadError('');

        const forms = await listExternalPselForms();
        if (!isMounted) return;

        setPselForms(forms);

        if (forms.length === 0) {
          setSelectedFormId('');
          setMembers([]);
          return;
        }

        setSelectedFormId(forms[0].id);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar os formularios do PSEL.'
        );
        setPselForms([]);
        setSelectedFormId('');
        setMembers([]);
      } finally {
        if (isMounted) {
          setIsLoadingForms(false);
        }
      }
    }

    loadForms();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function loadMembersFromSelectedForm() {
      if (!selectedFormId) {
        setMembers([]);
        setIsLoadingMembers(false);
        return;
      }

      try {
        setIsLoadingMembers(true);
        setLoadError('');

        const responses = await getExternalFormResponses(selectedFormId);
        if (!isMounted) return;

        setMembers(responses.map(mapResponseToCandidate));
      } catch (error) {
        if (!isMounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar os candidatos do PSEL.'
        );
        setMembers([]);
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false);
        }
      }
    }

    loadMembersFromSelectedForm();

    return () => {
      isMounted = false;
    };
  }, [selectedFormId]);

  const selectedForm = React.useMemo(
    () => pselForms.find((form) => form.id === selectedFormId) ?? null,
    [pselForms, selectedFormId]
  );

  const selectedFormPublicPath = React.useMemo(() => {
    if (!selectedForm) return '';
    const pathName = selectedForm.slug || selectedForm.nomeFormulario;
    return `/forms/${encodeURIComponent(pathName)}`;
  }, [selectedForm]);

  React.useEffect(() => {
    setCopyMessage('');
  }, [selectedFormId]);

  async function handleCopyLink() {
    if (!selectedFormPublicPath || typeof window === 'undefined') return;

    try {
      const absoluteLink = `${window.location.origin}${selectedFormPublicPath}`;
      await navigator.clipboard.writeText(absoluteLink);
      setCopyMessage('Link copiado.');
    } catch {
      setCopyMessage('Nao foi possivel copiar o link.');
    }
  }

  const normalizedQuery = normalizeText(query.trim());

  const filteredMembers = React.useMemo(() => {
    if (!normalizedQuery) return members;

    return members.filter((member) => {
      const fullName = `${member.nome} ${member.sobrenome}`;
      return [fullName, member.curso].some((field) =>
        normalizeText(field).includes(normalizedQuery)
      );
    });
  }, [members, normalizedQuery]);

  return (
    <PageContainer
      pageTitle='PSeletivo'
      pageDescription='Novos membros do processo seletivo'
      scrollable={false}
    >
      <div className='flex h-full min-h-0 min-w-0 flex-col gap-3'>
        <div className='bg-muted/20 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-sm font-semibold'>
              Total de membros: {filteredMembers.length}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleCopyLink}
              disabled={!selectedFormPublicPath}
            >
              Link
            </Button>
            <div className='w-full sm:w-72'>
              <Select
                value={selectedFormId}
                onValueChange={setSelectedFormId}
                disabled={isLoadingForms || pselForms.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Selecione o formulario PSEL' />
                </SelectTrigger>
                <SelectContent>
                  {pselForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.nomeFormulario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar por nome ou curso...'
            className='w-full sm:w-72'
            disabled={isLoadingMembers || isLoadingForms}
          />
        </div>

        {copyMessage ? (
          <p className='text-muted-foreground px-1 text-sm'>{copyMessage}</p>
        ) : null}

        {isLoadingMembers ? (
          <p className='text-muted-foreground px-1 text-sm'>
            Carregando candidatos...
          </p>
        ) : null}

        {loadError ? <p className='text-destructive px-1 text-sm'>{loadError}</p> : null}

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
                            {member.informacoesAdicionais.length > 0 ? (
                              <div className='space-y-2'>
                                <p className='text-muted-foreground text-xs font-medium'>
                                  Informacoes adicionais
                                </p>
                                {member.informacoesAdicionais.map((info) => (
                                  <CandidateField
                                    key={`${member.id}-${info.titulo}`}
                                    label={info.titulo}
                                    value={info.valor}
                                  />
                                ))}
                              </div>
                            ) : null}
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
                        {member.tarefas.length === 0 ? (
                          <li className='text-muted-foreground rounded-md border border-dashed p-2 text-sm'>
                            Nenhuma tarefa relacionada.
                          </li>
                        ) : null}
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
