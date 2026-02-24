'use client';

import * as React from 'react';
import Image from 'next/image';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTags, faXmark } from '@fortawesome/free-solid-svg-icons';

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

  // Estados para tags
  const [isTagsDialogOpen, setIsTagsDialogOpen] = React.useState(false);
  const [selectedCandidateForTags, setSelectedCandidateForTags] =
    React.useState<Candidate | null>(null);
  const [newTag, setNewTag] = React.useState('');
  const [isSavingTag, setIsSavingTag] = React.useState(false);
  const [isDisqualifyingCandidateId, setIsDisqualifyingCandidateId] =
    React.useState<string | null>(null);
  const [isDisqualifyDialogOpen, setIsDisqualifyDialogOpen] =
    React.useState(false);
  const [selectedCandidateForDisqualification, setSelectedCandidateForDisqualification] =
    React.useState<Candidate | null>(null);
  const [isBulkTagsDialogOpen, setIsBulkTagsDialogOpen] = React.useState(false);
  const [bulkTagName, setBulkTagName] = React.useState('');
  const [bulkTagAction, setBulkTagAction] = React.useState<'add' | 'remove'>(
    'add'
  );
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<
    Set<string>
  >(new Set());

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

  const openTagsDialog = (candidate: Candidate) => {
    setSelectedCandidateForTags(candidate);
    setIsTagsDialogOpen(true);
  };

  const handleAddTag = async () => {
    if (!selectedCandidateForTags || !selectedFormId) return;

    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    setIsSavingTag(true);
    try {
      await candidateService.addTagToCandidate(
        selectedFormId,
        selectedCandidateForTags.id,
        trimmedTag
      );
      toast.success('Tag adicionada com sucesso.');
      setNewTag('');
      // Atualizar o candidato localmente
      setSelectedCandidateForTags((current) => {
        if (!current) return current;
        const updatedTags = [...(current.tags ?? []), trimmedTag];
        return { ...current, tags: updatedTags };
      });
      // Atualizar a lista de membros
      setMembers((current) =>
        current.map((m) =>
          m.id === selectedCandidateForTags.id
            ? { ...m, tags: [...(m.tags ?? []), trimmedTag] }
            : m
        )
      );
    } catch (error: any) {
      if (error?.message?.includes('já existe')) {
        toast.error('Esta tag já existe para este candidato.');
      } else {
        console.error('Erro ao adicionar tag:', error);
        toast.error('Não foi possível adicionar a tag.');
      }
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedCandidateForTags || !selectedFormId) return;

    setIsSavingTag(true);
    try {
      await candidateService.removeTagFromCandidate(
        selectedFormId,
        selectedCandidateForTags.id,
        tag
      );
      toast.success('Tag removida com sucesso.');
      // Atualizar o candidato localmente
      setSelectedCandidateForTags((current) => {
        if (!current) return current;
        const updatedTags = (current.tags ?? []).filter((t) => t !== tag);
        return { ...current, tags: updatedTags };
      });
      // Atualizar a lista de membros
      setMembers((current) =>
        current.map((m) =>
          m.id === selectedCandidateForTags.id
            ? { ...m, tags: (m.tags ?? []).filter((t) => t !== tag) }
            : m
        )
      );
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      toast.error('Não foi possível remover a tag.');
    } finally {
      setIsSavingTag(false);
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidateIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const toggleAllCandidates = () => {
    if (selectedCandidateIds.size === filteredMembers.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(filteredMembers.map((m) => m.id)));
    }
  };

  const openBulkTagsDialog = () => {
    setSelectedCandidateIds(new Set());
    setBulkTagName('');
    setBulkTagAction('add');
    setIsBulkTagsDialogOpen(true);
  };

  const handleAddBulkTag = async () => {
    const trimmedTag = bulkTagName.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    if (selectedCandidateIds.size === 0) {
      toast.error('Selecione ao menos um candidato.');
      return;
    }

    if (!selectedFormId) return;

    setIsSavingTag(true);
    try {
      const result = await candidateService.addTagToMultipleCandidates(
        selectedFormId,
        Array.from(selectedCandidateIds),
        trimmedTag
      );

      if (result.success) {
        toast.success(
          `Tag "${trimmedTag}" adicionada a ${selectedCandidateIds.size} candidato(s).`
        );
        setBulkTagName('');
        setSelectedCandidateIds(new Set());
        setIsBulkTagsDialogOpen(false);
        // Recarregar candidatos para atualizar tags
        const responses =
          await candidateService.getCandidatesByForm(selectedFormId);
        setMembers(responses);
      } else {
        toast.error(result.error ?? 'Erro ao adicionar tag aos candidatos.');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar tag em lote:', error);
      toast.error('Não foi possível adicionar a tag.');
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleRemoveBulkTag = async () => {
    const trimmedTag = bulkTagName.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    if (selectedCandidateIds.size === 0) {
      toast.error('Selecione ao menos um candidato.');
      return;
    }

    if (!selectedFormId) return;

    setIsSavingTag(true);
    try {
      const result = await candidateService.removeTagFromMultipleCandidates(
        selectedFormId,
        Array.from(selectedCandidateIds),
        trimmedTag
      );

      if (result.success) {
        toast.success(
          `Tag "${trimmedTag}" removida de ${selectedCandidateIds.size} candidato(s).`
        );
        setBulkTagName('');
        setSelectedCandidateIds(new Set());
        setIsBulkTagsDialogOpen(false);
        // Recarregar candidatos para atualizar tags
        const responses =
          await candidateService.getCandidatesByForm(selectedFormId);
        setMembers(responses);
      } else {
        toast.error(result.error ?? 'Erro ao remover tag dos candidatos.');
      }
    } catch (error: any) {
      console.error('Erro ao remover tag em lote:', error);
      toast.error('Não foi possível remover a tag.');
    } finally {
      setIsSavingTag(false);
    }
  };

  const openDisqualifyDialog = (candidate: Candidate) => {
    const isAlreadyDisqualified =
      candidate.etapa.trim().toLowerCase() === 'desclassificado';
    if (isAlreadyDisqualified) {
      toast.error('Candidato ja esta desclassificado.');
      return;
    }

    setSelectedCandidateForDisqualification(candidate);
    setIsDisqualifyDialogOpen(true);
  };

  const handleConfirmDisqualifyCandidate = async () => {
    if (!selectedFormId || !selectedCandidateForDisqualification) return;

    const candidate = selectedCandidateForDisqualification;

    setIsDisqualifyingCandidateId(candidate.id);
    try {
      await candidateService.disqualifyCandidate(selectedFormId, candidate.id);

      setMembers((current) =>
        current.map((member) =>
          member.id === candidate.id
            ? { ...member, etapa: 'Desclassificado' }
            : member
        )
      );

      setSelectedCandidateForTags((current) =>
        current && current.id === candidate.id
          ? { ...current, etapa: 'Desclassificado' }
          : current
      );

      toast.success('Candidato desclassificado com sucesso.');
      setIsDisqualifyDialogOpen(false);
      setSelectedCandidateForDisqualification(null);
    } catch (error) {
      console.error('Erro ao desclassificar candidato:', error);
      toast.error('Nao foi possivel desclassificar o candidato.');
    } finally {
      setIsDisqualifyingCandidateId(null);
    }
  };

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
              onClick={openBulkTagsDialog}
              disabled={isLoadingMembers || isLoadingForms}
              className='w-full gap-2 sm:w-auto'
            >
              <FontAwesomeIcon icon={faTags} className='h-3 w-3' />
              Tags
            </Button>
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
                      <div className='min-w-0 flex-1'>
                        <CardTitle className='truncate text-base'>
                          {member.nome} {member.sobrenome}
                        </CardTitle>
                        <p className='text-muted-foreground text-xs'>
                          {member.curso} | {member.periodo} periodo
                        </p>
                        {member.tags && member.tags.length > 0 && (
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {member.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant='secondary'
                                className='text-[10px]'
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className='flex items-center gap-1'>
                        <Button
                          type='button'
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 shrink-0 cursor-pointer rounded-md border hover:bg-white/10 [&_svg]:h-[0.875em]! [&_svg]:w-[0.875em]!'
                          onClick={() => openTagsDialog(member)}
                          aria-label='Gerenciar tags'
                        >
                          <FontAwesomeIcon icon={faTags} />
                        </Button>
                        <Button
                          type='button'
                          size='icon'
                          variant='destructive'
                          className='h-8 w-8 shrink-0 rounded-full'
                          onClick={() => openDisqualifyDialog(member)}
                          disabled={
                            Boolean(isDisqualifyingCandidateId) ||
                            member.etapa.trim().toLowerCase() ===
                              'desclassificado'
                          }
                          aria-label={`Desclassificar ${member.nome} ${member.sobrenome}`}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </Button>
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
                    </div>
                    <div className='overflow-hidden rounded-md border'>
                      <Image
                        src={member.imagemUrl}
                        alt={`Imagem do candidato ${member.nome} ${member.sobrenome}`}
                        className='aspect-4/3 w-full object-cover'
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
                <Card className='col-span-full flex min-h-55 items-center justify-center overflow-hidden border-dashed'>
                  <CardContent className='text-muted-foreground py-8 text-center text-sm'>
                    Nenhum membro encontrado.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo de desclassificação */}
      <Dialog
        open={isDisqualifyDialogOpen}
        onOpenChange={(open) => {
          if (isDisqualifyingCandidateId) return;
          setIsDisqualifyDialogOpen(open);
          if (!open) {
            setSelectedCandidateForDisqualification(null);
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Desclassificar candidato</DialogTitle>
            <DialogDescription>
              {selectedCandidateForDisqualification
                ? `Deseja desclassificar ${selectedCandidateForDisqualification.nome} ${selectedCandidateForDisqualification.sobrenome}?`
                : 'Confirme a desclassificacao do candidato.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                setIsDisqualifyDialogOpen(false);
                setSelectedCandidateForDisqualification(null);
              }}
              disabled={Boolean(isDisqualifyingCandidateId)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleConfirmDisqualifyCandidate}
              disabled={
                !selectedCandidateForDisqualification ||
                Boolean(isDisqualifyingCandidateId)
              }
            >
              {isDisqualifyingCandidateId ? 'Desclassificando...' : 'Desclassificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de tags individual */}
      <Dialog
        open={isTagsDialogOpen}
        onOpenChange={(open) => {
          setIsTagsDialogOpen(open);
          if (!open) {
            setSelectedCandidateForTags(null);
            setNewTag('');
          }
        }}
      >
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Gerenciar tags</DialogTitle>
            <DialogDescription>
              {selectedCandidateForTags
                ? `Tags de ${selectedCandidateForTags.nome} ${selectedCandidateForTags.sobrenome}`
                : 'Adicione ou remova tags do candidato'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium' htmlFor='newTag'>
                Adicionar nova tag
              </label>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Input
                  id='newTag'
                  placeholder='Nome da tag'
                  value={newTag}
                  disabled={isSavingTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type='button'
                  onClick={handleAddTag}
                  disabled={isSavingTag || !newTag.trim()}
                >
                  Adicionar
                </Button>
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Tags atuais</label>
              {selectedCandidateForTags?.tags &&
              selectedCandidateForTags.tags.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {selectedCandidateForTags.tags.map((tag) => (
                    <div
                      key={tag}
                      className='flex items-center gap-2 rounded-md border p-2'
                    >
                      <Badge className='capitalize'>{tag}</Badge>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='h-6 w-6'
                        onClick={() => handleRemoveTag(tag)}
                        disabled={isSavingTag}
                        aria-label={`Remover tag ${tag}`}
                      >
                        <FontAwesomeIcon icon={faXmark} className='h-3 w-3' />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-muted-foreground rounded-md border p-4 text-center text-sm'>
                  Nenhuma tag adicionada ainda
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              onClick={() => setIsTagsDialogOpen(false)}
              disabled={isSavingTag}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de tags em lote */}
      <Dialog
        open={isBulkTagsDialogOpen}
        onOpenChange={(open) => {
          setIsBulkTagsDialogOpen(open);
          if (!open) {
            setSelectedCandidateIds(new Set());
            setBulkTagName('');
            setBulkTagAction('add');
          }
        }}
      >
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {bulkTagAction === 'add'
                ? 'Adicionar tag a múltiplos candidatos'
                : 'Remover tag de múltiplos candidatos'}
            </DialogTitle>
            <DialogDescription>
              {bulkTagAction === 'add'
                ? 'Selecione os candidatos e defina uma tag para adicionar a todos'
                : 'Selecione os candidatos e defina uma tag para remover de todos'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='bulkTagAction'>
                  Ação
                </label>
                <Select
                  value={bulkTagAction}
                  disabled={isSavingTag}
                  onValueChange={(value) =>
                    setBulkTagAction(value as 'add' | 'remove')
                  }
                >
                  <SelectTrigger id='bulkTagAction'>
                    <SelectValue placeholder='Selecione a ação' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='add'>Adicionar tag</SelectItem>
                    <SelectItem value='remove'>Remover tag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium' htmlFor='bulkTagName'>
                  Nome da tag
                </label>
                <Input
                  id='bulkTagName'
                  placeholder='Digite o nome da tag'
                  value={bulkTagName}
                  disabled={isSavingTag}
                  onChange={(e) => setBulkTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (bulkTagAction === 'add') {
                        handleAddBulkTag();
                      } else {
                        handleRemoveBulkTag();
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>
                  Selecione os candidatos ({selectedCandidateIds.size}{' '}
                  selecionado
                  {selectedCandidateIds.size !== 1 ? 's' : ''})
                </label>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={toggleAllCandidates}
                  disabled={isSavingTag}
                >
                  {selectedCandidateIds.size === filteredMembers.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </Button>
              </div>
              <ScrollArea className='h-75 rounded-md border p-3'>
                <div className='space-y-2'>
                  {filteredMembers.map((candidate) => (
                    <div
                      key={candidate.id}
                      className='flex items-start gap-3 rounded-md border p-3'
                    >
                      <Checkbox
                        id={`candidate-${candidate.id}`}
                        checked={selectedCandidateIds.has(candidate.id)}
                        onCheckedChange={() =>
                          toggleCandidateSelection(candidate.id)
                        }
                        disabled={isSavingTag}
                        className='mt-0.5'
                      />
                      <label
                        htmlFor={`candidate-${candidate.id}`}
                        className='flex flex-1 cursor-pointer flex-col'
                      >
                        <span className='text-sm font-medium'>
                          {candidate.nome} {candidate.sobrenome}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {candidate.curso} - {candidate.etapa}
                        </span>
                        {candidate.tags && candidate.tags.length > 0 && (
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {candidate.tags.map((tag: string) => (
                              <Badge
                                key={tag}
                                variant='secondary'
                                className='text-[10px]'
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsBulkTagsDialogOpen(false)}
              disabled={isSavingTag}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={
                bulkTagAction === 'add' ? handleAddBulkTag : handleRemoveBulkTag
              }
              disabled={
                isSavingTag ||
                !bulkTagName.trim() ||
                selectedCandidateIds.size === 0
              }
            >
              {isSavingTag
                ? bulkTagAction === 'add'
                  ? 'Adicionando...'
                  : 'Removendo...'
                : bulkTagAction === 'add'
                  ? 'Adicionar tag'
                  : 'Remover tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
