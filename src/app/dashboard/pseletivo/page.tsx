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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import candidateService from '@/services/candidateService';
import type {
  Candidate,
  CandidateForm,
  CandidateTaskStatus
} from '@/types/candidate/candidate';
import { toast } from 'sonner';

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

  const [pselForms, setPselForms] = React.useState<CandidateForm[]>([]);
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

        const forms = await candidateService.getPselForms();

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

        const responses =
          await candidateService.getCandidatesByForm(selectedFormId);
        if (!isMounted) return;

        setMembers(responses);
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
    return candidateService.getFormPublicPath(selectedForm);
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

  const filteredMembers = React.useMemo(() => {
    return candidateService.filterCandidates(members, query);
  }, [members, query]);

  return (
    <PageContainer
      pageTitle='PSeletivo'
      pageDescription='Novos membros do processo seletivo'
      scrollable={false}
    >
      <div className='flex h-full min-h-0 min-w-0 flex-col gap-3'>
        <div className='bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
            <p className='text-sm font-semibold'>
              Total de membros: {filteredMembers.length}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleCopyLink}
              disabled={!selectedFormPublicPath}
              className='w-full sm:w-auto'
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
            className='w-full lg:max-w-sm'
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

        {loadError ? (
          <p className='text-destructive px-1 text-sm'>{loadError}</p>
        ) : null}

        <div className='flex min-h-0 w-full max-w-full flex-1 overflow-hidden rounded-md'>
          <div className='h-full w-full max-w-full overflow-y-auto'>
            <div className='grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3'>
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className='flex h-full min-h-0 flex-col overflow-hidden'
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
                            className='h-8 w-8 rounded-full'
                            aria-label={`Abrir detalhes de ${member.nome} ${member.sobrenome}`}
                          >
                            i
                          </Button>
                        </DialogTrigger>
                        <DialogContent className='max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-xl'>
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
                            <CandidateField
                              label='Sobrenome'
                              value={member.sobrenome}
                            />
                            <CandidateField
                              label='Curso'
                              value={member.curso}
                            />
                            <CandidateField
                              label='Periodo'
                              value={member.periodo}
                            />
                            <CandidateField
                              label='Etapa'
                              value={member.etapa}
                            />
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
                            <CandidateField
                              label='O que te move'
                              value={member.oQueMove}
                            />
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
                        className='aspect-[4/3] w-full object-cover'
                        width={320}
                        height={240}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
                    <p className='text-muted-foreground text-xs font-medium'>
                      Tarefas relacionadas
                    </p>
                    <ScrollArea className='max-h-40 w-full pr-2 sm:max-h-48'>
                      <ul className='space-y-2'>
                        {member.tarefas.length === 0 ? (
                          <li className='text-muted-foreground rounded-md border border-dashed p-2 text-sm'>
                            Nenhuma tarefa relacionada.
                          </li>
                        ) : null}
                        {member.tarefas.map((task) => (
                          <li key={task.id} className='rounded-md border p-2'>
                            <div className='flex items-center justify-between gap-2'>
                              <p className='text-sm font-medium'>
                                {task.titulo}
                              </p>
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
                <Card className='col-span-full flex min-h-[220px] items-center justify-center overflow-hidden border-dashed'>
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
