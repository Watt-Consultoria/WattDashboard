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
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useMetadata from '@/hooks/use-metadata';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import candidateService from '@/services/candidateService';
import savedCandidateService from '@/services/savedCandidateService';
import type {
  Candidate,
  CandidateForm,
  CandidateTaskStatus
} from '@/types/candidate/candidate';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTags,
  faXmark,
  faUserPlus,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import {
  EMAIL_TEMPLATES,
  renderEmailTemplate
} from '@/types/candidate/email-template';
import type { EmailTemplate } from '@/types/candidate/email-template';

type ViewMode = 'pre-candidatos' | 'candidatos';

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
  const { members: companyMembers } = useFirebaseData();

  const [pselForms, setPselForms] = React.useState<CandidateForm[]>([]);
  const [selectedFormId, setSelectedFormId] = React.useState('');
  const [members, setMembers] = React.useState<Candidate[]>([]);
  const [query, setQuery] = React.useState('');
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);
  const [isLoadingForms, setIsLoadingForms] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [copyMessage, setCopyMessage] = React.useState('');

  // View mode: pré-candidatos (respostas do formulário) ou candidatos (salvos)
  const [viewMode, setViewMode] = React.useState<ViewMode>('pre-candidatos');
  const [savedCandidates, setSavedCandidates] = React.useState<Candidate[]>([]);
  const [isLoadingSavedCandidates, setIsLoadingSavedCandidates] =
    React.useState(false);
  const [isSavingAsCandidate, setIsSavingAsCandidate] = React.useState<
    string | null
  >(null);
  // Set de IDs de pré-candidatos já salvos como candidato
  const [savedPreCandidateIds, setSavedPreCandidateIds] = React.useState<
    Set<string>
  >(new Set());

  // Estados para tags
  const [isTagsDialogOpen, setIsTagsDialogOpen] = React.useState(false);
  const [selectedCandidateForTags, setSelectedCandidateForTags] =
    React.useState<Candidate | null>(null);
  const [newTag, setNewTag] = React.useState('');
  const [isSavingTag, setIsSavingTag] = React.useState(false);
  const [isInterviewSlotsDialogOpen, setIsInterviewSlotsDialogOpen] =
    React.useState(false);
  const [interviewDate, setInterviewDate] = React.useState<Date | undefined>();
  const [interviewStartTime, setInterviewStartTime] = React.useState('09:00');
  const [interviewEndTime, setInterviewEndTime] = React.useState('09:30');
  const [interviewResponsibleMemberId, setInterviewResponsibleMemberId] =
    React.useState('');
  const [availableInterviewSlots, setAvailableInterviewSlots] = React.useState<
    Array<{
      id: string;
      isoDate: string;
      dateLabel: string;
      startTime: string;
      endTime: string;
      startMinutes: number;
      endMinutes: number;
      responsibleMemberId: string;
      responsibleMemberName: string;
    }>
  >([]);
  const [isDisqualifyingCandidateId, setIsDisqualifyingCandidateId] =
    React.useState<string | null>(null);
  const [isDisqualifyDialogOpen, setIsDisqualifyDialogOpen] =
    React.useState(false);
  const [
    selectedCandidateForDisqualification,
    setSelectedCandidateForDisqualification
  ] = React.useState<Candidate | null>(null);
  const [isBulkTagsDialogOpen, setIsBulkTagsDialogOpen] = React.useState(false);
  const [bulkTagName, setBulkTagName] = React.useState('');
  const [bulkTagAction, setBulkTagAction] = React.useState<'add' | 'remove'>(
    'add'
  );
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<
    Set<string>
  >(new Set());

  // Estados para notificação por email
  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false);
  const [selectedEmailTemplate, setSelectedEmailTemplate] =
    React.useState<EmailTemplate | null>(null);
  const [emailTemplateValues, setEmailTemplateValues] = React.useState<
    Record<string, string>
  >({});
  const [emailTargetTag, setEmailTargetTag] = React.useState('');
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailNotificationMode, setEmailNotificationMode] = React.useState<
    'tag' | 'individual'
  >('tag');
  const [emailSelectedCandidateIds, setEmailSelectedCandidateIds] =
    React.useState<Set<string>>(new Set());
  const [showEmailPreview, setShowEmailPreview] = React.useState(false);

  // Coletar todas as tags únicas dos candidatos salvos
  const allCandidateTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    savedCandidates.forEach((c) => {
      c.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [savedCandidates]);

  // Preview renderizado do email
  const renderedEmailPreview = React.useMemo(() => {
    if (!selectedEmailTemplate) return null;
    try {
      return renderEmailTemplate(selectedEmailTemplate, emailTemplateValues);
    } catch {
      return null;
    }
  }, [selectedEmailTemplate, emailTemplateValues]);

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

  // Carregar candidatos salvos quando o viewMode muda para 'candidatos'
  React.useEffect(() => {
    let isMounted = true;

    async function loadSavedCandidates() {
      if (viewMode !== 'candidatos') return;

      try {
        setIsLoadingSavedCandidates(true);
        setLoadError('');

        const candidates =
          await savedCandidateService.listSavedCandidatesAsCandidate();
        if (!isMounted) return;

        setSavedCandidates(candidates);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os candidatos.'
        );
        setSavedCandidates([]);
      } finally {
        if (isMounted) setIsLoadingSavedCandidates(false);
      }
    }

    loadSavedCandidates();

    return () => {
      isMounted = false;
    };
  }, [viewMode]);

  // Carregar IDs dos pré-candidatos já salvos
  React.useEffect(() => {
    async function loadSavedIds() {
      if (viewMode !== 'pre-candidatos' || members.length === 0) return;

      try {
        const allSaved = await savedCandidateService.listSavedCandidates();
        const ids = new Set(allSaved.map((sc) => sc.respostaIdOrigem));
        setSavedPreCandidateIds(ids);
      } catch {
        // silently fail
      }
    }
    loadSavedIds();
  }, [viewMode, members]);

  const selectedForm = React.useMemo(
    () => pselForms.find((form) => form.id === selectedFormId) ?? null,
    [pselForms, selectedFormId]
  );

  const selectedFormPublicPath = React.useMemo(() => {
    return candidateService.getFormPublicPath(selectedForm);
  }, [selectedForm]);

  const interviewResponsibleOptions = React.useMemo(
    () =>
      companyMembers
        .filter((member) => Boolean(member.id && member.name))
        .map((member) => ({
          id: member.id,
          name: member.name
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [companyMembers]
  );

  React.useEffect(() => {
    if (interviewResponsibleOptions.length === 0) {
      if (interviewResponsibleMemberId) {
        setInterviewResponsibleMemberId('');
      }
      return;
    }

    const responsibleStillExists = interviewResponsibleOptions.some(
      (member) => member.id === interviewResponsibleMemberId
    );
    if (responsibleStillExists) {
      return;
    }

    setInterviewResponsibleMemberId(interviewResponsibleOptions[0].id);
  }, [interviewResponsibleMemberId, interviewResponsibleOptions]);

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

  const handleSaveAsCandidate = async (candidate: Candidate) => {
    if (!selectedFormId) return;

    setIsSavingAsCandidate(candidate.id);
    try {
      await savedCandidateService.savePreCandidateAsCandidate(
        candidate,
        selectedFormId
      );
      toast.success(
        `${candidate.nome} ${candidate.sobrenome} salvo como candidato.`
      );
      setSavedPreCandidateIds((prev) => new Set([...prev, candidate.id]));
    } catch (error: any) {
      if (error?.message?.includes('já foi salvo')) {
        toast.error('Este pré-candidato já foi salvo como candidato.');
      } else {
        console.error('Erro ao salvar como candidato:', error);
        toast.error('Não foi possível salvar como candidato.');
      }
    } finally {
      setIsSavingAsCandidate(null);
    }
  };

  const openTagsDialog = (candidate: Candidate) => {
    setSelectedCandidateForTags(candidate);
    setIsTagsDialogOpen(true);
  };

  const handleAddTag = async () => {
    if (!selectedCandidateForTags || viewMode !== 'candidatos') return;

    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    setIsSavingTag(true);
    try {
      await savedCandidateService.addTagToCandidate(
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
      // Atualizar a lista de candidatos
      setSavedCandidates((current) =>
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
    if (!selectedCandidateForTags || viewMode !== 'candidatos') return;

    setIsSavingTag(true);
    try {
      await savedCandidateService.removeTagFromCandidate(
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
      // Atualizar a lista de candidatos
      setSavedCandidates((current) =>
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
    if (viewMode !== 'candidatos') return;

    const trimmedTag = bulkTagName.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    if (selectedCandidateIds.size === 0) {
      toast.error('Selecione ao menos um candidato.');
      return;
    }

    setIsSavingTag(true);
    try {
      const result = await savedCandidateService.addTagToMultipleCandidates(
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
        // Recarregar candidatos
        const candidates =
          await savedCandidateService.listSavedCandidatesAsCandidate();
        setSavedCandidates(candidates);
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
    if (viewMode !== 'candidatos') return;

    const trimmedTag = bulkTagName.trim();
    if (!trimmedTag) {
      toast.error('Informe o nome da tag.');
      return;
    }

    if (selectedCandidateIds.size === 0) {
      toast.error('Selecione ao menos um candidato.');
      return;
    }

    setIsSavingTag(true);
    try {
      const result =
        await savedCandidateService.removeTagFromMultipleCandidates(
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
        // Recarregar candidatos
        const candidates =
          await savedCandidateService.listSavedCandidatesAsCandidate();
        setSavedCandidates(candidates);
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
    if (!selectedCandidateForDisqualification) return;
    if (viewMode === 'pre-candidatos' && !selectedFormId) return;

    const candidate = selectedCandidateForDisqualification;

    setIsDisqualifyingCandidateId(candidate.id);
    try {
      if (viewMode === 'candidatos') {
        await savedCandidateService.disqualifyCandidate(candidate.id);
      } else {
        await candidateService.disqualifyCandidate(
          selectedFormId,
          candidate.id
        );
      }

      const updateList =
        viewMode === 'candidatos' ? setSavedCandidates : setMembers;
      updateList((current) =>
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

  // ── Email notification handlers ──

  const handleSelectEmailTemplate = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId) ?? null;
    setSelectedEmailTemplate(template);
    setEmailTemplateValues({});
    setShowEmailPreview(false);
  };

  const resetEmailDialog = () => {
    setIsEmailDialogOpen(false);
    setSelectedEmailTemplate(null);
    setEmailTemplateValues({});
    setEmailTargetTag('');
    setEmailSelectedCandidateIds(new Set());
    setEmailNotificationMode('tag');
    setShowEmailPreview(false);
  };

  const handleToggleEmailCandidate = (candidateId: string) => {
    setEmailSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleToggleAllEmailCandidates = () => {
    if (emailSelectedCandidateIds.size === savedCandidates.length) {
      setEmailSelectedCandidateIds(new Set());
    } else {
      setEmailSelectedCandidateIds(new Set(savedCandidates.map((c) => c.id)));
    }
  };

  const handleSendEmail = async () => {
    if (!selectedEmailTemplate) return;

    const hasTarget =
      emailNotificationMode === 'tag'
        ? !!emailTargetTag
        : emailSelectedCandidateIds.size > 0;

    if (!hasTarget) return;

    setIsSendingEmail(true);
    try {
      const rendered = renderEmailTemplate(
        selectedEmailTemplate,
        emailTemplateValues
      );

      const payload: Record<string, unknown> = {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text
      };

      if (emailNotificationMode === 'tag') {
        payload.tag = emailTargetTag;
      } else {
        payload.candidateIds = Array.from(emailSelectedCandidateIds);
      }

      const res = await fetch('/api/candidate/notify-tagged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Email enviado com sucesso para ${data.sent}/${data.total} candidato(s).`
        );
        resetEmailDialog();
      } else if (res.status === 207) {
        toast.warning(
          `Email enviado parcialmente: ${data.sent}/${data.total}. Erros: ${data.errors?.join(', ')}`
        );
      } else {
        toast.error(data.error ?? 'Erro ao enviar emails.');
      }
    } catch (error) {
      console.error('Erro ao enviar emails:', error);
      toast.error('Não foi possível enviar os emails.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const currentMembers = viewMode === 'candidatos' ? savedCandidates : members;

  const isCurrentlyLoading =
    viewMode === 'candidatos' ? isLoadingSavedCandidates : isLoadingMembers;
  const handleAddInterviewSlot = () => {
    const toMinutes = (timeValue: string): number | null => {
      const [hoursText, minutesText] = timeValue.split(':');
      const hours = Number(hoursText);
      const minutes = Number(minutesText);

      if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return null;
      }

      return hours * 60 + minutes;
    };

    if (!interviewDate) {
      toast.error('Selecione uma data para o horario.');
      return;
    }

    if (!interviewResponsibleMemberId) {
      toast.error('Selecione o membro responsavel.');
      return;
    }

    if (!interviewStartTime || !interviewEndTime) {
      toast.error('Informe horario de inicio e fim.');
      return;
    }

    const startMinutes = toMinutes(interviewStartTime);
    const endMinutes = toMinutes(interviewEndTime);

    if (startMinutes === null || endMinutes === null) {
      toast.error('Horario invalido.');
      return;
    }

    if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
      toast.error('Os horarios devem ser multiplos de 30 minutos.');
      return;
    }

    if (endMinutes <= startMinutes) {
      toast.error('O horario de fim deve ser maior que o de inicio.');
      return;
    }

    if ((endMinutes - startMinutes) % 30 !== 0) {
      toast.error('A duracao deve ser multipla de 30 minutos.');
      return;
    }

    const responsibleMember = interviewResponsibleOptions.find(
      (member) => member.id === interviewResponsibleMemberId
    );
    if (!responsibleMember) {
      toast.error('Membro responsavel invalido.');
      return;
    }

    const year = interviewDate.getFullYear();
    const month = String(interviewDate.getMonth() + 1).padStart(2, '0');
    const day = String(interviewDate.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    const dateLabel = new Intl.DateTimeFormat('pt-BR').format(interviewDate);
    const id = `${isoDate}-${interviewResponsibleMemberId}-${interviewStartTime}-${interviewEndTime}`;

    setAvailableInterviewSlots((current) => {
      if (current.some((slot) => slot.id === id)) {
        toast.error('Horario ja adicionado.');
        return current;
      }

      const hasOverlapForResponsible = current.some((slot) => {
        if (
          slot.isoDate !== isoDate ||
          slot.responsibleMemberId !== interviewResponsibleMemberId
        ) {
          return false;
        }

        return startMinutes < slot.endMinutes && endMinutes > slot.startMinutes;
      });

      if (hasOverlapForResponsible) {
        toast.error(
          'Ja existe um horario conflitante para este responsavel nesta data.'
        );
        return current;
      }

      const updated = [
        ...current,
        {
          id,
          isoDate,
          dateLabel,
          startTime: interviewStartTime,
          endTime: interviewEndTime,
          startMinutes,
          endMinutes,
          responsibleMemberId: interviewResponsibleMemberId,
          responsibleMemberName: responsibleMember.name
        }
      ];
      updated.sort((left, right) =>
        `${left.isoDate}-${String(left.startMinutes).padStart(4, '0')}-${left.responsibleMemberName}`.localeCompare(
          `${right.isoDate}-${String(right.startMinutes).padStart(4, '0')}-${right.responsibleMemberName}`
        )
      );
      return updated;
    });

    toast.success('Horario de entrevista disponibilizado.');
  };

  const handleRemoveInterviewSlot = (slotId: string) => {
    setAvailableInterviewSlots((current) =>
      current.filter((slot) => slot.id !== slotId)
    );
  };

  const filteredMembers = React.useMemo(() => {
    if (viewMode === 'candidatos') {
      return savedCandidateService.filterCandidates(currentMembers, query);
    }
    return candidateService.filterCandidates(currentMembers, query);
  }, [currentMembers, query, viewMode]);

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
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsInterviewSlotsDialogOpen(true)}
              className='w-full sm:w-auto'
            >
              Horarios de entrevista
            </Button>
            <div className='w-full sm:w-72'>
              <Select
                value={viewMode}
                onValueChange={(value) => setViewMode(value as ViewMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Visualização' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='pre-candidatos'>Pré-candidatos</SelectItem>
                  <SelectItem value='candidatos'>Candidatos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {viewMode === 'candidatos' && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={openBulkTagsDialog}
                disabled={isCurrentlyLoading || isLoadingForms}
                className='w-full gap-2 sm:w-auto'
              >
                <FontAwesomeIcon icon={faTags} className='h-3 w-3' />
                Tags
              </Button>
            )}
            {viewMode === 'candidatos' && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setIsEmailDialogOpen(true)}
                disabled={isCurrentlyLoading || isLoadingForms}
                className='w-full gap-2 sm:w-auto'
              >
                <FontAwesomeIcon icon={faEnvelope} className='h-3 w-3' />
                Notificar
              </Button>
            )}
            {viewMode === 'pre-candidatos' && (
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
            )}
            {viewMode === 'pre-candidatos' && (
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
            )}
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar por nome ou curso...'
            className='w-full lg:max-w-sm'
            disabled={isCurrentlyLoading || isLoadingForms}
          />
        </div>

        {copyMessage && viewMode === 'pre-candidatos' ? (
          <p className='text-muted-foreground px-1 text-sm'>{copyMessage}</p>
        ) : null}

        {isCurrentlyLoading ? (
          <p className='text-muted-foreground px-1 text-sm'>
            Carregando{' '}
            {viewMode === 'candidatos' ? 'candidatos' : 'pré-candidatos'}...
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
                        {viewMode === 'candidatos' && (
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
                        )}
                        {viewMode === 'pre-candidatos' && (
                          <Button
                            type='button'
                            size='icon'
                            variant='ghost'
                            className='h-8 w-8 shrink-0 cursor-pointer rounded-md border text-green-600 hover:bg-green-600/10 [&_svg]:h-[0.875em]! [&_svg]:w-[0.875em]!'
                            onClick={() => handleSaveAsCandidate(member)}
                            disabled={
                              isSavingAsCandidate === member.id ||
                              savedPreCandidateIds.has(member.id)
                            }
                            aria-label={
                              savedPreCandidateIds.has(member.id)
                                ? 'Já salvo como candidato'
                                : `Salvar ${member.nome} como candidato`
                            }
                            title={
                              savedPreCandidateIds.has(member.id)
                                ? 'Já salvo como candidato'
                                : 'Salvar como candidato'
                            }
                          >
                            <FontAwesomeIcon
                              icon={faUserPlus}
                              className={
                                savedPreCandidateIds.has(member.id)
                                  ? 'opacity-40'
                                  : ''
                              }
                            />
                          </Button>
                        )}
                        {viewMode === 'candidatos' && (
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
                        )}
                        {viewMode === 'pre-candidatos' &&
                          !savedPreCandidateIds.has(member.id) && (
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
                          )}
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
                              <CandidateField
                                label='Nome'
                                value={member.nome}
                              />
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

      {/* Diálogo de horários de entrevistas */}
      <Dialog
        open={isInterviewSlotsDialogOpen}
        onOpenChange={setIsInterviewSlotsDialogOpen}
      >
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Disponibilizar horarios de entrevistas</DialogTitle>
            <DialogDescription>
              Selecione um dia no calendario e defina os horarios para entrevista.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <Card>
              <CardContent className='p-4'>
                <div className='grid items-start gap-4 md:grid-cols-2'>
                  <div className='mx-auto w-full'>
                    <Calendar
                      mode='single'
                      selected={interviewDate}
                      onSelect={setInterviewDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      className='mx-auto'
                    />
                  </div>
                  <div className='min-w-0'>
                    {availableInterviewSlots.length === 0 ? (
                      <div className='text-muted-foreground rounded-md border border-dashed p-3 text-sm'>
                        Nenhum horario adicionado.
                      </div>
                    ) : (
                      <ScrollArea className='h-[18.5rem] rounded-md border p-2'>
                        <div className='space-y-2'>
                          {availableInterviewSlots.map((slot) => (
                            <div
                              key={slot.id}
                              className='flex items-center justify-between gap-2 rounded-md border p-2'
                            >
                              <div className='min-w-0 flex-1'>
                                <p className='text-sm'>
                                  {slot.dateLabel} | {slot.startTime} - {slot.endTime}
                                </p>
                                <p className='text-muted-foreground truncate text-xs'>
                                  Responsavel: {slot.responsibleMemberName}
                                </p>
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 shrink-0'
                                onClick={() => handleRemoveInterviewSlot(slot.id)}
                                aria-label={`Remover horario ${slot.dateLabel} ${slot.startTime} ${slot.endTime}`}
                              >
                                <FontAwesomeIcon icon={faXmark} className='h-3 w-3' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className='space-y-3'>
              <div className='space-y-2'>
                <label
                  className='text-sm font-medium'
                  htmlFor='interview-responsible'
                >
                  Responsavel
                </label>
                <Select
                  value={interviewResponsibleMemberId}
                  onValueChange={setInterviewResponsibleMemberId}
                >
                  <SelectTrigger id='interview-responsible'>
                    <SelectValue placeholder='Selecione o responsavel' />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewResponsibleOptions.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <label
                    className='text-sm font-medium'
                    htmlFor='interview-start-time'
                  >
                    Inicio
                  </label>
                  <Input
                    id='interview-start-time'
                    type='time'
                    step='1800'
                    value={interviewStartTime}
                    onChange={(event) =>
                      setInterviewStartTime(event.target.value)
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <label
                    className='text-sm font-medium'
                    htmlFor='interview-end-time'
                  >
                    Fim
                  </label>
                  <Input
                    id='interview-end-time'
                    type='time'
                    step='1800'
                    value={interviewEndTime}
                    onChange={(event) => setInterviewEndTime(event.target.value)}
                  />
                </div>
              </div>

              <p className='text-muted-foreground text-xs'>
                O intervalo precisa ser multiplo de 30 minutos.
              </p>

              <Button
                type='button'
                className='w-full'
                onClick={handleAddInterviewSlot}
                disabled={interviewResponsibleOptions.length === 0}
              >
                Adicionar horario
              </Button>

              {interviewResponsibleOptions.length === 0 ? (
                <p className='text-muted-foreground text-xs'>
                  Nenhum membro responsavel disponivel para selecao.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsInterviewSlotsDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {isDisqualifyingCandidateId
                ? 'Desclassificando...'
                : 'Desclassificar'}
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

      {/* Diálogo de notificação por email */}
      <Dialog
        open={isEmailDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetEmailDialog();
          else setIsEmailDialogOpen(true);
        }}
      >
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-hidden'>
          <DialogHeader>
            <DialogTitle>Notificar Candidatos por Email</DialogTitle>
            <DialogDescription>
              Selecione os destinatários, escolha um modelo de email, preencha
              os campos e visualize o resultado antes de enviar.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='max-h-[calc(90vh-180px)] pr-3'>
            <div className='flex flex-col gap-4 pb-1'>
              {/* ── Destinatários ── */}
              <Tabs
                value={emailNotificationMode}
                onValueChange={(v) =>
                  setEmailNotificationMode(v as 'tag' | 'individual')
                }
              >
                <Label className='mb-1.5 block'>Destinatários</Label>
                <TabsList className='w-full'>
                  <TabsTrigger value='tag' className='flex-1'>
                    Por tag
                  </TabsTrigger>
                  <TabsTrigger value='individual' className='flex-1'>
                    Selecionar candidatos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='tag'>
                  <div className='space-y-2 pt-2'>
                    <Select
                      value={emailTargetTag}
                      onValueChange={setEmailTargetTag}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Selecione uma tag' />
                      </SelectTrigger>
                      <SelectContent>
                        {allCandidateTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allCandidateTags.length === 0 && (
                      <p className='text-muted-foreground text-xs'>
                        Nenhuma tag encontrada. Adicione tags aos candidatos
                        primeiro.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value='individual'>
                  <div className='space-y-2 pt-2'>
                    <div className='flex items-center justify-between'>
                      <p className='text-muted-foreground text-xs'>
                        {emailSelectedCandidateIds.size} de{' '}
                        {savedCandidates.length} selecionado(s)
                      </p>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={handleToggleAllEmailCandidates}
                        className='h-7 text-xs'
                      >
                        {emailSelectedCandidateIds.size ===
                        savedCandidates.length
                          ? 'Desmarcar todos'
                          : 'Selecionar todos'}
                      </Button>
                    </div>
                    <ScrollArea className='h-44 rounded-md border p-2'>
                      <div className='flex flex-col gap-1'>
                        {savedCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className='hover:bg-accent flex items-center gap-2 rounded px-2 py-1.5'
                          >
                            <Checkbox
                              id={`email-cand-${candidate.id}`}
                              checked={emailSelectedCandidateIds.has(
                                candidate.id
                              )}
                              onCheckedChange={() =>
                                handleToggleEmailCandidate(candidate.id)
                              }
                            />
                            <label
                              htmlFor={`email-cand-${candidate.id}`}
                              className='flex flex-1 cursor-pointer flex-col'
                            >
                              <span className='text-sm font-medium'>
                                {candidate.nome} {candidate.sobrenome}
                              </span>
                              <span className='text-muted-foreground text-xs'>
                                {candidate.email || 'Sem email'} —{' '}
                                {candidate.etapa}
                              </span>
                            </label>
                          </div>
                        ))}
                        {savedCandidates.length === 0 && (
                          <p className='text-muted-foreground py-4 text-center text-xs'>
                            Nenhum candidato salvo.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>

              {/* ── Modelo de email ── */}
              <div className='space-y-2'>
                <Label>Modelo de email</Label>
                <Select
                  value={selectedEmailTemplate?.id ?? ''}
                  onValueChange={handleSelectEmailTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Selecione um modelo' />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmailTemplate && (
                  <p className='text-muted-foreground text-xs'>
                    {selectedEmailTemplate.descricao}
                  </p>
                )}
              </div>

              {/* ── Campos dinâmicos ── */}
              {selectedEmailTemplate &&
                selectedEmailTemplate.campos.map((campo) => (
                  <div key={campo.id} className='space-y-2'>
                    <Label htmlFor={`email-field-${campo.id}`}>
                      {campo.label}
                      {campo.required && (
                        <span className='text-destructive ml-1'>*</span>
                      )}
                    </Label>
                    {campo.type === 'textarea' ? (
                      <Textarea
                        id={`email-field-${campo.id}`}
                        placeholder={campo.placeholder}
                        value={emailTemplateValues[campo.id] ?? ''}
                        onChange={(e) =>
                          setEmailTemplateValues((v) => ({
                            ...v,
                            [campo.id]: e.target.value
                          }))
                        }
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={`email-field-${campo.id}`}
                        placeholder={campo.placeholder}
                        value={emailTemplateValues[campo.id] ?? ''}
                        onChange={(e) =>
                          setEmailTemplateValues((v) => ({
                            ...v,
                            [campo.id]: e.target.value
                          }))
                        }
                      />
                    )}
                  </div>
                ))}

              {/* ── Preview ── */}
              {selectedEmailTemplate && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label>Pré-visualização</Label>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setShowEmailPreview((v) => !v)}
                      className='h-7 text-xs'
                    >
                      {showEmailPreview ? 'Ocultar' : 'Mostrar'} preview
                    </Button>
                  </div>

                  {showEmailPreview && renderedEmailPreview && (
                    <div className='space-y-2'>
                      <div className='rounded-md border p-3'>
                        <p className='text-muted-foreground mb-1 text-xs font-medium'>
                          Assunto
                        </p>
                        <p className='text-sm font-semibold'>
                          {renderedEmailPreview.subject}
                        </p>
                      </div>
                      <div className='overflow-hidden rounded-md border'>
                        <iframe
                          title='Email preview'
                          srcDoc={renderedEmailPreview.html}
                          className='h-80 w-full border-0'
                          sandbox=''
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={resetEmailDialog}
              disabled={isSendingEmail}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleSendEmail}
              disabled={
                isSendingEmail ||
                !selectedEmailTemplate ||
                (emailNotificationMode === 'tag' && !emailTargetTag) ||
                (emailNotificationMode === 'individual' &&
                  emailSelectedCandidateIds.size === 0) ||
                (selectedEmailTemplate?.campos
                  .filter((c) => c.required)
                  .some((c) => !emailTemplateValues[c.id]?.trim()) ??
                  false)
              }
            >
              {isSendingEmail ? 'Enviando...' : 'Enviar Emails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
