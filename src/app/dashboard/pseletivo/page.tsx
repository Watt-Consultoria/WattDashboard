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
import { cn } from '@/lib/utils';
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
  faEnvelope,
  faCheck,
  faThumbsDown,
  faCalendarDays
} from '@fortawesome/free-solid-svg-icons';
import {
  EMAIL_TEMPLATES,
  CANDIDATE_PLACEHOLDERS,
  renderEmailTemplate,
  renderEmailTemplatePreview
} from '@/types/candidate/email-template';
import type { EmailTemplate } from '@/types/candidate/email-template';
import {
  listInterviewSlots,
  removeInterviewSlot as removeInterviewSlotFromDatabase,
  saveInterviewSlot,
  sortInterviewSlots,
  type InterviewSlot
} from './interview';

type ViewMode = 'pre-candidatos' | 'candidatos' | 'desclassificados';

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

const INTERVIEW_TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const value = `${String(index).padStart(2, '0')}:00`;
  return {
    value,
    label: `${index}:00`
  };
});

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const truncateName = (text: string, maxChars: number = 10): string => {
  return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
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
  useMetadata({ title: 'Processo Seletivo' });
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
  // Desclassificados (tanto pré-candidatos quanto candidatos salvos)
  const [disqualifiedCandidates, setDisqualifiedCandidates] = React.useState<
    Candidate[]
  >([]);
  const [isLoadingDisqualified, setIsLoadingDisqualified] =
    React.useState(false);

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
  const [interviewEndTime, setInterviewEndTime] = React.useState('10:00');
  const [interviewResponsibleMemberId, setInterviewResponsibleMemberId] =
    React.useState('');
  const [availableInterviewSlots, setAvailableInterviewSlots] = React.useState<
    InterviewSlot[]
  >([]);
  const [isLoadingInterviewSlots, setIsLoadingInterviewSlots] =
    React.useState(false);
  const [isSavingInterviewSlot, setIsSavingInterviewSlot] =
    React.useState(false);
  const [isRemovingInterviewSlotId, setIsRemovingInterviewSlotId] =
    React.useState<string | null>(null);
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

  // Estados para aprovação/rejeição de candidatos
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = React.useState(false);
  const [selectedCandidateForApproval, setSelectedCandidateForApproval] =
    React.useState<Candidate | null>(null);
  const [isApprovingCandidateId, setIsApprovingCandidateId] = React.useState<
    string | null
  >(null);
  const [approvalMessage, setApprovalMessage] = React.useState('');

  const [isRejectionDialogOpen, setIsRejectionDialogOpen] =
    React.useState(false);
  const [selectedCandidateForRejection, setSelectedCandidateForRejection] =
    React.useState<Candidate | null>(null);
  const [isRejectingCandidateId, setIsRejectingCandidateId] = React.useState<
    string | null
  >(null);
  const [rejectionMessage, setRejectionMessage] = React.useState('');
  const [rejectionFeedback, setRejectionFeedback] = React.useState('');

  // Estados para envio de horários de entrevista por email
  const [isInterviewEmailDialogOpen, setIsInterviewEmailDialogOpen] =
    React.useState(false);
  const [interviewEmailFormId, setInterviewEmailFormId] = React.useState('');
  const [
    interviewEmailSelectedCandidateIds,
    setInterviewEmailSelectedCandidateIds
  ] = React.useState<Set<string>>(new Set());
  const [isSendingInterviewEmail, setIsSendingInterviewEmail] =
    React.useState(false);

  // Estados para confirmação de entrevista (Google Meet)
  const [isConfirmInterviewDialogOpen, setIsConfirmInterviewDialogOpen] =
    React.useState(false);
  const [confirmInterviewSlot, setConfirmInterviewSlot] =
    React.useState<InterviewSlot | null>(null);
  const [confirmGoogleMeetLink, setConfirmGoogleMeetLink] = React.useState('');
  const [isSendingConfirmation, setIsSendingConfirmation] =
    React.useState(false);

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

  // Preview renderizado do email (com placeholders destacados como exemplo)
  const renderedEmailPreview = React.useMemo(() => {
    if (!selectedEmailTemplate) return null;
    try {
      return renderEmailTemplatePreview(
        selectedEmailTemplate,
        emailTemplateValues
      );
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

        const filteredForms = forms.filter((form) => form);

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

        // Primeiro, carregar todos os salvos para obter os IDs das respostas
        const allSaved = await savedCandidateService.listSavedCandidates();
        const savedRespostaIds = new Set(
          allSaved.map((sc) => sc.respostaIdOrigem)
        );

        if (!isMounted) return;

        // Depois, carregar pré-candidatos do formulário selecionado
        const responses =
          await candidateService.getCandidatesByForm(selectedFormId);

        const filteredResponses = responses.filter((response) => {
          return (
            !savedRespostaIds.has(response.id) && !response.desclassificado
          );
        });

        if (!isMounted) return;

        setMembers(filteredResponses);
        setSavedPreCandidateIds(savedRespostaIds);
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
          await savedCandidateService.listActiveSavedCandidatesAsCandidate();
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

  // Carregar desclassificados quando o viewMode muda para 'desclassificados'
  React.useEffect(() => {
    let isMounted = true;

    async function loadDisqualified() {
      if (viewMode !== 'desclassificados') return;

      try {
        setIsLoadingDisqualified(true);
        setLoadError('');

        // Buscar desclassificados de candidatos salvos
        const disqualifiedSaved =
          await savedCandidateService.listDisqualifiedSavedCandidatesAsCandidate();

        // Buscar desclassificados de pré-candidatos (respostas de formulário)
        // Iterar sobre todos os formulários disponíveis
        let disqualifiedPre: Candidate[] = [];
        for (const form of pselForms) {
          try {
            const allResponses = await candidateService.getCandidatesByForm(
              form.id
            );
            const preDisqualified = allResponses.filter(
              (r) => r.desclassificado
            );
            disqualifiedPre = [...disqualifiedPre, ...preDisqualified];
          } catch {
            // Continuar para o próximo formulário se houver erro
            continue;
          }
        }

        if (!isMounted) return;

        // Combinar sem duplicar (pré-candidatos que foram salvos já aparecerão como saved)
        // Os pré-candidatos desclassificados que já foram salvos não devem duplicar
        const allSaved = await savedCandidateService.listSavedCandidates();
        const savedRespostaOrigensIds = new Set(
          allSaved.map((sc) => sc.respostaIdOrigem)
        );
        const uniquePre = disqualifiedPre.filter(
          (c) => !savedRespostaOrigensIds.has(c.id)
        );

        setDisqualifiedCandidates([...disqualifiedSaved, ...uniquePre]);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os desclassificados.'
        );
        setDisqualifiedCandidates([]);
      } finally {
        if (isMounted) setIsLoadingDisqualified(false);
      }
    }

    loadDisqualified();

    return () => {
      isMounted = false;
    };
  }, [viewMode, pselForms]);

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

  const selectedInterviewIsoDate = React.useMemo(() => {
    if (!interviewDate) {
      return '';
    }
    return toIsoDate(interviewDate);
  }, [interviewDate]);

  const interviewSlotsForSelectedDate = React.useMemo(() => {
    if (!selectedInterviewIsoDate) {
      return [];
    }

    return availableInterviewSlots.filter(
      (slot) => slot.isoDate === selectedInterviewIsoDate
    );
  }, [availableInterviewSlots, selectedInterviewIsoDate]);

  const interviewCalendarDatesWithSlots = React.useMemo(() => {
    const uniqueIsoDates = new Set(
      availableInterviewSlots.map((slot) => slot.isoDate)
    );

    return Array.from(uniqueIsoDates).map((isoDate) => {
      const [year, month, day] = isoDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [availableInterviewSlots]);

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
    let isMounted = true;

    async function loadInterviewSlotsForForm() {
      if (!selectedFormId) {
        setAvailableInterviewSlots([]);
        setIsLoadingInterviewSlots(false);
        return;
      }

      try {
        setIsLoadingInterviewSlots(true);
        const slots = await listInterviewSlots(selectedFormId);
        if (!isMounted) return;
        setAvailableInterviewSlots(slots);
      } catch (error) {
        if (!isMounted) return;
        console.error('Erro ao carregar horarios de entrevista:', error);
        setAvailableInterviewSlots([]);
        toast.error('Nao foi possivel carregar os horarios de entrevista.');
      } finally {
        if (isMounted) {
          setIsLoadingInterviewSlots(false);
        }
      }
    }

    loadInterviewSlotsForForm();

    return () => {
      isMounted = false;
    };
  }, [selectedFormId]);

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
          await savedCandidateService.listActiveSavedCandidatesAsCandidate();
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
          await savedCandidateService.listActiveSavedCandidatesAsCandidate();
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
    if (candidate.desclassificado) {
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

      // Remover o candidato da lista atual (ele irá para a aba de desclassificados)
      const updateList =
        viewMode === 'candidatos' ? setSavedCandidates : setMembers;
      updateList((current) =>
        current.filter((member) => member.id !== candidate.id)
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

  // ── Approval handlers ──

  const openApprovalDialog = (candidate: Candidate) => {
    const isAlreadyApproved =
      candidate.etapa.trim().toLowerCase() === 'aprovado';
    if (isAlreadyApproved) {
      toast.error('Candidato já está aprovado.');
      return;
    }

    setSelectedCandidateForApproval(candidate);
    setApprovalMessage('');
    setIsApprovalDialogOpen(true);
  };

  const handleConfirmApproveCandidate = async () => {
    if (!selectedCandidateForApproval) return;

    const candidate = selectedCandidateForApproval;
    setIsApprovingCandidateId(candidate.id);

    try {
      // Chama o endpoint de aprovação com email automático
      const res = await fetch(`/api/candidate/${candidate.id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          message: approvalMessage || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao aprovar candidato');
      }

      // Atualiza a lista de candidatos
      const updateList =
        viewMode === 'candidatos' ? setSavedCandidates : setMembers;
      updateList((current) =>
        current.map((member) =>
          member.id === candidate.id ? { ...member, etapa: 'Aprovado' } : member
        )
      );

      setSelectedCandidateForTags((current) =>
        current && current.id === candidate.id
          ? { ...current, etapa: 'Aprovado' }
          : current
      );

      toast.success('Candidato aprovado e email enviado com sucesso.');
      setIsApprovalDialogOpen(false);
      setSelectedCandidateForApproval(null);
    } catch (error) {
      console.error('Erro ao aprovar candidato:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível aprovar o candidato.'
      );
    } finally {
      setIsApprovingCandidateId(null);
    }
  };

  // ── Rejection handlers ──

  const openRejectionDialog = (candidate: Candidate) => {
    if (candidate.desclassificado) {
      toast.error('Candidato já está rejeitado.');
      return;
    }

    setSelectedCandidateForRejection(candidate);
    setRejectionMessage('');
    setRejectionFeedback('');
    setIsRejectionDialogOpen(true);
  };

  const handleConfirmRejectCandidate = async () => {
    if (!selectedCandidateForRejection) return;

    const candidate = selectedCandidateForRejection;
    setIsRejectingCandidateId(candidate.id);

    try {
      // Chama o endpoint de rejeição com email automático
      const res = await fetch(`/api/candidate/${candidate.id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          message: rejectionMessage || undefined,
          feedback: rejectionFeedback || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao rejeitar candidato');
      }

      // Atualiza a lista de candidatos - remove da lista atual
      const updateList =
        viewMode === 'candidatos' ? setSavedCandidates : setMembers;
      updateList((current) =>
        current.filter((member) => member.id !== candidate.id)
      );

      toast.success('Candidato rejeitado e email enviado com sucesso.');
      setIsRejectionDialogOpen(false);
      setSelectedCandidateForRejection(null);
    } catch (error) {
      console.error('Erro ao rejeitar candidato:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível rejeitar o candidato.'
      );
    } finally {
      setIsRejectingCandidateId(null);
    }
  };

  // ── Email notification handlers ──

  // ── Interview Slots email handlers ──

  const resetInterviewEmailDialog = () => {
    setIsInterviewEmailDialogOpen(false);
    setInterviewEmailFormId('');
    setInterviewEmailSelectedCandidateIds(new Set());
  };

  const handleToggleInterviewEmailCandidate = (candidateId: string) => {
    setInterviewEmailSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleToggleAllInterviewEmailCandidates = () => {
    if (interviewEmailSelectedCandidateIds.size === savedCandidates.length) {
      setInterviewEmailSelectedCandidateIds(new Set());
    } else {
      setInterviewEmailSelectedCandidateIds(
        new Set(savedCandidates.map((c) => c.id))
      );
    }
  };

  const handleSendInterviewSlotsEmail = async () => {
    if (!interviewEmailFormId) {
      toast.error('Selecione o formulário PSEL.');
      return;
    }
    if (interviewEmailSelectedCandidateIds.size === 0) {
      toast.error('Selecione ao menos um candidato.');
      return;
    }

    setIsSendingInterviewEmail(true);
    try {
      const res = await fetch('/api/candidate/send-interview-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: interviewEmailFormId,
          candidateIds: Array.from(interviewEmailSelectedCandidateIds)
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Horários enviados com sucesso para ${data.sent}/${data.total} candidato(s).`
        );
        resetInterviewEmailDialog();
      } else if (res.status === 207) {
        toast.warning(
          `Envio parcial: ${data.sent}/${data.total}. Erros: ${data.errors?.join(', ')}`
        );
      } else {
        toast.error(data.error ?? 'Erro ao enviar horários de entrevista.');
      }
    } catch (error) {
      console.error('Erro ao enviar horários de entrevista:', error);
      toast.error('Não foi possível enviar os horários de entrevista.');
    } finally {
      setIsSendingInterviewEmail(false);
    }
  };

  const handleOpenConfirmInterview = (slot: InterviewSlot) => {
    setConfirmInterviewSlot(slot);
    setConfirmGoogleMeetLink(slot.googleMeetLink ?? '');
    setIsConfirmInterviewDialogOpen(true);
  };

  const resetConfirmInterviewDialog = () => {
    setIsConfirmInterviewDialogOpen(false);
    setConfirmInterviewSlot(null);
    setConfirmGoogleMeetLink('');
  };

  const handleSendInterviewConfirmation = async () => {
    if (!confirmInterviewSlot || !selectedFormId) return;

    if (!confirmGoogleMeetLink.trim()) {
      toast.error('Informe o link do Google Meet.');
      return;
    }

    setIsSendingConfirmation(true);
    try {
      const res = await fetch('/api/candidate/confirm-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedFormId,
          slotId: confirmInterviewSlot.id,
          googleMeetLink: confirmGoogleMeetLink.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message ?? 'Email de confirmação enviado!');

        // Atualizar o slot localmente com o googleMeetLink
        setAvailableInterviewSlots((current) =>
          current.map((s) =>
            s.id === confirmInterviewSlot.id
              ? { ...s, googleMeetLink: confirmGoogleMeetLink.trim() }
              : s
          )
        );

        resetConfirmInterviewDialog();
      } else {
        toast.error(data.error ?? 'Erro ao enviar confirmação.');
      }
    } catch (error) {
      console.error('Erro ao enviar confirmação de entrevista:', error);
      toast.error('Não foi possível enviar a confirmação.');
    } finally {
      setIsSendingConfirmation(false);
    }
  };

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
        text: rendered.text,
        // Envia templateId e templateValues para o servidor poder renderizar
        // o template personalizado por candidato ({{nome}}, {{sobrenome}}, etc.)
        templateId: selectedEmailTemplate.id,
        templateValues: emailTemplateValues
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

  const currentMembers =
    viewMode === 'candidatos'
      ? savedCandidates
      : viewMode === 'desclassificados'
        ? disqualifiedCandidates
        : members;

  const isCurrentlyLoading =
    viewMode === 'candidatos'
      ? isLoadingSavedCandidates
      : viewMode === 'desclassificados'
        ? isLoadingDisqualified
        : isLoadingMembers;
  const handleAddInterviewSlot = async () => {
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

    if (!selectedFormId) {
      toast.error('Selecione um formulario para salvar os horarios.');
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

    if (endMinutes <= startMinutes) {
      toast.error('O horario de fim deve ser maior que o de inicio.');
      return;
    }

    if (endMinutes - startMinutes !== 60) {
      toast.error('Cada entrevista deve ter exatamente 1 hora de duracao.');
      return;
    }

    const responsibleMember = interviewResponsibleOptions.find(
      (member) => member.id === interviewResponsibleMemberId
    );
    if (!responsibleMember) {
      toast.error('Membro responsavel invalido.');
      return;
    }

    const isoDate = toIsoDate(interviewDate);
    const dateLabel = new Intl.DateTimeFormat('pt-BR').format(interviewDate);
    const id = `${isoDate}-${interviewResponsibleMemberId}-${interviewStartTime}-${interviewEndTime}`;

    if (availableInterviewSlots.some((slot) => slot.id === id)) {
      toast.error('Horario ja adicionado.');
      return;
    }

    const hasOverlapForResponsible = availableInterviewSlots.some((slot) => {
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
      return;
    }

    const slotToSave: InterviewSlot = {
      id,
      isoDate,
      dateLabel,
      startTime: interviewStartTime,
      endTime: interviewEndTime,
      startMinutes,
      endMinutes,
      responsibleMemberId: interviewResponsibleMemberId,
      responsibleMemberName: responsibleMember.name,
      status: 'available'
    };

    try {
      setIsSavingInterviewSlot(true);
      await saveInterviewSlot(selectedFormId, slotToSave);

      setAvailableInterviewSlots((current) =>
        sortInterviewSlots([
          ...current.filter((slot) => slot.id !== slotToSave.id),
          slotToSave
        ])
      );

      toast.success('Horario de entrevista disponibilizado.');
    } catch (error) {
      console.error('Erro ao salvar horario de entrevista:', error);
      toast.error('Nao foi possivel salvar o horario de entrevista.');
    } finally {
      setIsSavingInterviewSlot(false);
    }
  };

  const handleRemoveInterviewSlot = async (slotId: string) => {
    if (!selectedFormId) {
      toast.error('Selecione um formulario para remover horarios.');
      return;
    }

    try {
      setIsRemovingInterviewSlotId(slotId);
      await removeInterviewSlotFromDatabase(selectedFormId, slotId);
      setAvailableInterviewSlots((current) =>
        current.filter((slot) => slot.id !== slotId)
      );
    } catch (error) {
      console.error('Erro ao remover horario de entrevista:', error);
      toast.error('Nao foi possivel remover o horario de entrevista.');
    } finally {
      setIsRemovingInterviewSlotId((current) =>
        current === slotId ? null : current
      );
    }
  };

  const filteredMembers = React.useMemo(() => {
    if (viewMode === 'candidatos' || viewMode === 'desclassificados') {
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
            {/* <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleCopyLink}
              disabled={!selectedFormPublicPath}
              className='w-full sm:w-auto'
            >
              Link
            </Button> */}
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
                  <SelectItem value='desclassificados'>
                    Desclassificados
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* {viewMode === 'candidatos' && (
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
            )} */}
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
            {viewMode === 'candidatos' && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  setInterviewEmailFormId(selectedFormId);
                  setInterviewEmailSelectedCandidateIds(new Set());
                  setIsInterviewEmailDialogOpen(true);
                }}
                disabled={isCurrentlyLoading || isLoadingForms}
                className='w-full gap-2 sm:w-auto'
              >
                <FontAwesomeIcon icon={faCalendarDays} className='h-3 w-3' />
                Enviar Entrevistas
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
            {viewMode === 'candidatos'
              ? 'candidatos'
              : viewMode === 'desclassificados'
                ? 'desclassificados'
                : 'pré-candidatos'}
            ...
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
                          {truncateName(member.nome + ' ' + member.sobrenome)}
                        </CardTitle>
                        <p className='text-muted-foreground text-xs'>
                          {member.curso} | {member.periodo} periodo
                        </p>
                        {viewMode === 'desclassificados' && (
                          <div className='mt-1 flex flex-wrap gap-1'>
                            <Badge
                              variant='destructive'
                              className='text-[10px]'
                            >
                              Desclassificado
                            </Badge>
                            <Badge variant='outline' className='text-[10px]'>
                              Etapa: {member.etapa}
                            </Badge>
                          </div>
                        )}
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
                          <>
                            {/* <Button
                              type='button'
                              size='icon'
                              variant='default'
                              className='h-8 w-8 shrink-0 rounded-full bg-green-600 hover:bg-green-700'
                              onClick={() => openApprovalDialog(member)}
                              disabled={
                                Boolean(isApprovingCandidateId) ||
                                member.etapa.trim().toLowerCase() === 'aprovado'
                              }
                              aria-label={`Aprovar ${member.nome} ${member.sobrenome}`}
                              title='Aprovar candidato'
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </Button> */}
                            {/* <Button
                              type='button'
                              size='icon'
                              variant='destructive'
                              className='h-8 w-8 shrink-0 rounded-full'
                              onClick={() =>
                                isRejectingCandidateId === member.id
                                  ? null
                                  : openRejectionDialog(member)
                              }
                              disabled={
                                Boolean(isRejectingCandidateId) ||
                                member.etapa.trim().toLowerCase() ===
                                  'desclassificado'
                              }
                              aria-label={`Rejeitar ${member.nome} ${member.sobrenome}`}
                              title='Rejeitar candidato'
                            >
                              <FontAwesomeIcon icon={faThumbsDown} />
                            </Button> */}
                            <Button
                              type='button'
                              size='icon'
                              variant='ghost'
                              className='text-destructive h-8 w-8 shrink-0 rounded-full hover:bg-red-100'
                              onClick={() => openDisqualifyDialog(member)}
                              disabled={
                                Boolean(isDisqualifyingCandidateId) ||
                                Boolean(member.desclassificado)
                              }
                              aria-label={`Desclassificar ${member.nome} ${member.sobrenome}`}
                              title='Desclassificar candidato'
                            >
                              <FontAwesomeIcon icon={faXmark} />
                            </Button>
                          </>
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
                                Boolean(member.desclassificado)
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
                                {truncateName(
                                  member.nome + ' ' + member.sobrenome
                                )}
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

                  {viewMode === 'candidatos' && (
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
                  )}
                </Card>
              ))}

              {filteredMembers.length === 0 ? (
                <Card className='col-span-full flex min-h-55 items-center justify-center overflow-hidden border-dashed'>
                  <CardContent className='text-muted-foreground py-8 text-center text-sm'>
                    {viewMode === 'desclassificados'
                      ? 'Nenhum candidato desclassificado encontrado.'
                      : viewMode === 'candidatos'
                        ? 'Nenhum candidato encontrado.'
                        : 'Nenhum pré-candidato encontrado.'}
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
              Selecione um dia no calendario e defina os horarios para
              entrevista.
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
                      modifiers={{
                        hasInterviewSlots: interviewCalendarDatesWithSlots
                      }}
                      modifiersClassNames={{
                        hasInterviewSlots:
                          'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 aria-selected:bg-emerald-600 aria-selected:text-white'
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      className='mx-auto'
                    />
                  </div>
                  <div className='min-w-0'>
                    {isLoadingInterviewSlots ? (
                      <div className='text-muted-foreground flex h-58 items-center rounded-md border border-dashed p-3 text-sm'>
                        Carregando horarios...
                      </div>
                    ) : !interviewDate ? (
                      <div className='text-muted-foreground flex h-58 items-center rounded-md border border-dashed p-3 text-sm'>
                        Selecione uma data para visualizar os horarios.
                      </div>
                    ) : interviewSlotsForSelectedDate.length === 0 ? (
                      <div className='text-muted-foreground flex h-58 items-center rounded-md border border-dashed p-3 text-sm'>
                        Nenhum horario adicionado para esta data.
                      </div>
                    ) : (
                      <ScrollArea className='h-58 rounded-md'>
                        <div className='space-y-2'>
                          {interviewSlotsForSelectedDate.map((slot) => (
                            <div
                              key={slot.id}
                              className={cn(
                                'rounded-md border p-2.5',
                                slot.status === 'booked'
                                  ? 'border-amber-300/60 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-950/30'
                                  : ''
                              )}
                            >
                              <div className='flex items-start justify-between gap-2'>
                                <div className='min-w-0 flex-1'>
                                  <div className='flex flex-wrap items-center gap-1.5'>
                                    <p className='text-sm font-medium whitespace-nowrap'>
                                      {slot.startTime} - {slot.endTime}
                                    </p>
                                    {slot.status === 'booked' ? (
                                      <Badge
                                        variant='secondary'
                                        className='bg-amber-100 text-[10px] text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                      >
                                        Ocupado
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant='secondary'
                                        className='bg-emerald-100 text-[10px] text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                      >
                                        Disponível
                                      </Badge>
                                    )}
                                  </div>
                                  <p className='text-muted-foreground truncate text-xs'>
                                    {slot.responsibleMemberName}
                                  </p>
                                  {slot.status === 'booked' &&
                                    slot.bookedByCandidateName && (
                                      <p className='truncate text-xs text-amber-700 dark:text-amber-400'>
                                        Reservado por:{' '}
                                        {slot.bookedByCandidateName}
                                      </p>
                                    )}
                                  {slot.status === 'booked' &&
                                    slot.googleMeetLink && (
                                      <p className='truncate text-xs text-emerald-600 dark:text-emerald-400'>
                                        <span className='font-medium'>
                                          Meet:
                                        </span>{' '}
                                        <a
                                          href={slot.googleMeetLink}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                          className='underline underline-offset-2 hover:opacity-80'
                                        >
                                          {slot.googleMeetLink.replace(
                                            /^https?:\/\//,
                                            ''
                                          )}
                                        </a>
                                      </p>
                                    )}
                                </div>

                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 shrink-0 opacity-60 hover:opacity-100'
                                  disabled={
                                    isSavingInterviewSlot ||
                                    isRemovingInterviewSlotId === slot.id
                                  }
                                  onClick={() =>
                                    handleRemoveInterviewSlot(slot.id)
                                  }
                                  aria-label={`Remover horario ${slot.dateLabel} ${slot.startTime} ${slot.endTime}`}
                                >
                                  <FontAwesomeIcon
                                    icon={faXmark}
                                    className='h-3 w-3'
                                  />
                                </Button>
                              </div>

                              {slot.status === 'booked' &&
                                slot.bookedByCandidateId && (
                                  <div className='mt-2 flex justify-end border-t border-amber-200/60 pt-2 dark:border-amber-800/40'>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      className='h-7 px-2.5 text-xs'
                                      onClick={() =>
                                        handleOpenConfirmInterview(slot)
                                      }
                                    >
                                      <FontAwesomeIcon
                                        icon={faEnvelope}
                                        className='mr-1.5 h-3 w-3'
                                      />
                                      {slot.googleMeetLink
                                        ? 'Reenviar confirmação'
                                        : 'Enviar confirmação'}
                                    </Button>
                                  </div>
                                )}
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
                  <Select
                    value={interviewStartTime}
                    onValueChange={(value) => {
                      setInterviewStartTime(value);
                      // Auto-set end time to start + 1 hour
                      const hour = parseInt(value.split(':')[0], 10);
                      if (hour < 23) {
                        setInterviewEndTime(
                          `${String(hour + 1).padStart(2, '0')}:00`
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id='interview-start-time'
                      size='sm'
                      className='w-full'
                    >
                      <SelectValue placeholder='Selecione o inicio' />
                    </SelectTrigger>
                    <SelectContent className='max-h-48'>
                      {INTERVIEW_TIME_OPTIONS.map((timeOption) => (
                        <SelectItem
                          key={`start-${timeOption.value}`}
                          value={timeOption.value}
                        >
                          {timeOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <label
                    className='text-sm font-medium'
                    htmlFor='interview-end-time'
                  >
                    Fim
                  </label>
                  <Select
                    value={interviewEndTime}
                    onValueChange={setInterviewEndTime}
                  >
                    <SelectTrigger
                      id='interview-end-time'
                      size='sm'
                      className='w-full'
                    >
                      <SelectValue placeholder='Selecione o fim' />
                    </SelectTrigger>
                    <SelectContent className='max-h-48'>
                      {INTERVIEW_TIME_OPTIONS.map((timeOption) => (
                        <SelectItem
                          key={`end-${timeOption.value}`}
                          value={timeOption.value}
                        >
                          {timeOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className='text-muted-foreground text-xs'>
                Cada entrevista dura exatamente 1 hora.
              </p>

              <Button
                type='button'
                className='w-full'
                onClick={handleAddInterviewSlot}
                disabled={
                  interviewResponsibleOptions.length === 0 ||
                  !selectedFormId ||
                  isSavingInterviewSlot
                }
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

      {/* Diálogo de aprovação */}
      <Dialog
        open={isApprovalDialogOpen}
        onOpenChange={(open) => {
          if (isApprovingCandidateId) return;
          setIsApprovalDialogOpen(open);
          if (!open) {
            setSelectedCandidateForApproval(null);
            setApprovalMessage('');
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Aprovar candidato</DialogTitle>
            <DialogDescription>
              {selectedCandidateForApproval
                ? `Aprovar ${selectedCandidateForApproval.nome} ${selectedCandidateForApproval.sobrenome}? Um email será enviado automaticamente.`
                : 'Confirme a aprovação do candidato.'}
            </DialogDescription>
          </DialogHeader>
          {selectedCandidateForApproval && (
            <div className='space-y-3'>
              <div className='space-y-2'>
                <Label htmlFor='approval-msg'>
                  Mensagem adicional (opcional)
                </Label>
                <Textarea
                  id='approval-msg'
                  placeholder='Ex.: Ficamos impressionados com seu desempenho!'
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                setIsApprovalDialogOpen(false);
                setSelectedCandidateForApproval(null);
                setApprovalMessage('');
              }}
              disabled={Boolean(isApprovingCandidateId)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              className='bg-green-600 hover:bg-green-700'
              onClick={handleConfirmApproveCandidate}
              disabled={
                !selectedCandidateForApproval || Boolean(isApprovingCandidateId)
              }
            >
              {isApprovingCandidateId ? 'Aprovando...' : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de rejeição */}
      <Dialog
        open={isRejectionDialogOpen}
        onOpenChange={(open) => {
          if (isRejectingCandidateId) return;
          setIsRejectionDialogOpen(open);
          if (!open) {
            setSelectedCandidateForRejection(null);
            setRejectionMessage('');
            setRejectionFeedback('');
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Rejeitar candidato</DialogTitle>
            <DialogDescription>
              {selectedCandidateForRejection
                ? `Rejeitar ${selectedCandidateForRejection.nome} ${selectedCandidateForRejection.sobrenome}? Um email será enviado automaticamente.`
                : 'Confirme a rejeição do candidato.'}
            </DialogDescription>
          </DialogHeader>
          {selectedCandidateForRejection && (
            <div className='space-y-3'>
              <div className='space-y-2'>
                <Label htmlFor='rejection-msg'>Mensagem principal</Label>
                <Textarea
                  id='rejection-msg'
                  placeholder='Ex.: Agradecemos sua participação...'
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  rows={2}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='rejection-feedback'>Feedback (opcional)</Label>
                <Textarea
                  id='rejection-feedback'
                  placeholder='Ex.: Recomendamos...'
                  value={rejectionFeedback}
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                setIsRejectionDialogOpen(false);
                setSelectedCandidateForRejection(null);
                setRejectionMessage('');
                setRejectionFeedback('');
              }}
              disabled={Boolean(isRejectingCandidateId)}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleConfirmRejectCandidate}
              disabled={
                !selectedCandidateForRejection ||
                Boolean(isRejectingCandidateId)
              }
            >
              {isRejectingCandidateId ? 'Rejeitando...' : 'Rejeitar'}
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

              {/* ── Placeholders de candidato ── */}
              {selectedEmailTemplate && (
                <div className='space-y-2'>
                  <Label>Campos automáticos do candidato</Label>
                  <p className='text-muted-foreground text-xs'>
                    Use estes marcadores nos campos abaixo. Eles serão
                    preenchidos automaticamente com os dados de cada candidato
                    no momento do envio.
                  </p>
                  <div className='flex flex-wrap gap-1.5'>
                    {CANDIDATE_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph.id}
                        type='button'
                        className='bg-accent hover:bg-accent/80 inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium transition-colors'
                        title={`${ph.descricao} — ex.: ${ph.exemplo}. Clique para copiar.`}
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${ph.id}}}`);
                          toast.info(`{{${ph.id}}} copiado!`);
                        }}
                      >
                        <span className='text-muted-foreground mr-1'>
                          {'{'}
                          {'{'}
                        </span>
                        {ph.label}
                        <span className='text-muted-foreground ml-1'>
                          {'}'}
                          {'}'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      <p className='text-muted-foreground text-xs italic'>
                        Os valores destacados em amarelo são exemplos. No envio
                        real, serão substituídos pelos dados de cada candidato.
                      </p>
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
      {/* Diálogo de envio de horários de entrevista por email */}
      <Dialog
        open={isInterviewEmailDialogOpen}
        onOpenChange={(open) => {
          if (isSendingInterviewEmail) return;
          if (!open) resetInterviewEmailDialog();
          setIsInterviewEmailDialogOpen(open);
        }}
      >
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-[95vw] overflow-y-auto sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Enviar horários de entrevista</DialogTitle>
            <DialogDescription>
              Envie por email os horários de entrevista disponíveis (não
              ocupados e futuros) para os candidatos selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {/* Seleção do formulário */}
            <div className='space-y-2'>
              <Label htmlFor='interview-email-form'>Formulário PSEL</Label>
              <Select
                value={interviewEmailFormId}
                onValueChange={setInterviewEmailFormId}
                disabled={isLoadingForms || pselForms.length === 0}
              >
                <SelectTrigger id='interview-email-form'>
                  <SelectValue placeholder='Selecione o formulário' />
                </SelectTrigger>
                <SelectContent>
                  {pselForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.nomeFormulario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-muted-foreground text-xs'>
                Selecione o formulário cujos horários de entrevista serão
                enviados.
              </p>
            </div>

            {/* Lista de candidatos com checkbox */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label>Candidatos</Label>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleToggleAllInterviewEmailCandidates}
                  className='text-xs'
                >
                  {interviewEmailSelectedCandidateIds.size ===
                  savedCandidates.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </Button>
              </div>
              <ScrollArea className='max-h-64 rounded-md border p-2'>
                {savedCandidates.length === 0 ? (
                  <p className='text-muted-foreground py-4 text-center text-sm'>
                    Nenhum candidato salvo.
                  </p>
                ) : (
                  <ul className='space-y-1'>
                    {savedCandidates.map((candidate) => (
                      <li
                        key={candidate.id}
                        className='flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/5'
                      >
                        <Checkbox
                          checked={interviewEmailSelectedCandidateIds.has(
                            candidate.id
                          )}
                          onCheckedChange={() =>
                            handleToggleInterviewEmailCandidate(candidate.id)
                          }
                          id={`interview-email-${candidate.id}`}
                        />
                        <label
                          htmlFor={`interview-email-${candidate.id}`}
                          className='flex-1 cursor-pointer text-sm'
                        >
                          {candidate.nome} {candidate.sobrenome}
                          {candidate.email ? (
                            <span className='text-muted-foreground ml-1 text-xs'>
                              ({candidate.email})
                            </span>
                          ) : (
                            <span className='ml-1 text-xs text-red-500'>
                              (sem email)
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
              <p className='text-muted-foreground text-xs'>
                {interviewEmailSelectedCandidateIds.size} candidato(s)
                selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={resetInterviewEmailDialog}
              disabled={isSendingInterviewEmail}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleSendInterviewSlotsEmail}
              disabled={
                isSendingInterviewEmail ||
                !interviewEmailFormId ||
                interviewEmailSelectedCandidateIds.size === 0
              }
            >
              {isSendingInterviewEmail ? 'Enviando...' : 'Enviar Horários'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Confirmação de Entrevista (Google Meet) */}
      <Dialog
        open={isConfirmInterviewDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetConfirmInterviewDialog();
        }}
      >
        <DialogContent className='w-[95vw] max-w-md sm:w-full'>
          <DialogHeader>
            <DialogTitle>Confirmar Entrevista</DialogTitle>
            <DialogDescription>
              Envie um email de confirmação ao candidato com o link do Google
              Meet para a entrevista.
            </DialogDescription>
          </DialogHeader>

          {confirmInterviewSlot && (
            <div className='space-y-4'>
              <div className='rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800'>
                <p className='text-sm font-medium'>
                  {confirmInterviewSlot.dateLabel}
                </p>
                <p className='text-muted-foreground text-sm'>
                  {confirmInterviewSlot.startTime} –{' '}
                  {confirmInterviewSlot.endTime}
                </p>
                <p className='text-muted-foreground text-xs'>
                  Responsável: {confirmInterviewSlot.responsibleMemberName}
                </p>
                {confirmInterviewSlot.bookedByCandidateName && (
                  <p className='mt-1 text-xs font-medium text-amber-700 dark:text-amber-400'>
                    Candidato: {confirmInterviewSlot.bookedByCandidateName}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <label
                  className='text-sm font-medium'
                  htmlFor='google-meet-link'
                >
                  Link do Google Meet
                </label>
                <Input
                  id='google-meet-link'
                  type='url'
                  placeholder='https://meet.google.com/xxx-xxxx-xxx'
                  value={confirmGoogleMeetLink}
                  onChange={(e) => setConfirmGoogleMeetLink(e.target.value)}
                  className='text-sm'
                />
              </div>
            </div>
          )}

          <DialogFooter className='flex-col gap-2 sm:flex-row'>
            <Button
              type='button'
              variant='secondary'
              onClick={resetConfirmInterviewDialog}
              disabled={isSendingConfirmation}
              className='w-full sm:w-auto'
            >
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleSendInterviewConfirmation}
              disabled={isSendingConfirmation || !confirmGoogleMeetLink.trim()}
              className='w-full sm:w-auto'
            >
              {isSendingConfirmation ? 'Enviando...' : 'Enviar Confirmação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
