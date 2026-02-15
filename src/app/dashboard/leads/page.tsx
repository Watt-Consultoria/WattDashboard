'use client';

import * as React from 'react';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { useAuth } from '@/features/auth/components/auth-provider';
import { firebaseDb } from '@/lib/firebase/client';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import { LeadDeleteDialog } from './lead-delete-dialog';
import { LeadDetailsDialog } from './lead-details-dialog';
import { LeadFormDialog } from './lead-form-dialog';
import { LeadsList } from './leads-list';
import { LeadsPageHeader } from './leads-page-header';
import type { Lead, LeadComment, LeadContact, LeadFormState } from './types';
import useMetadata from '@/hooks/use-metadata';

const initialFormState: LeadFormState = {
  responsibleId: '',
  responsibleName: '',
  leadName: '',
  cnpj: '',
  contacts: [
    {
      name: '',
      email: '',
      phone: '',
      role: ''
    }
  ],
  date: '',
  location: '',
  interestedServices: '',
  proposalLink: '',
  hasBeenContacted: false
};

export default function LeadsPage() {
  const { members } = useFirebaseData();
  const { user } = useAuth();
  const [form, setForm] = React.useState<LeadFormState>(initialFormState);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingLeadId, setEditingLeadId] = React.useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = React.useState<string | null>(
    null
  );
  const [togglingLeadId, setTogglingLeadId] = React.useState<string | null>(
    null
  );
  const [leadToDelete, setLeadToDelete] = React.useState<Lead | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
  const [comments, setComments] = React.useState<LeadComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [isSavingComment, setIsSavingComment] = React.useState(false);
  const formContacts = form.contacts ?? [];
  const selectedLeadId = selectedLead ? selectedLead.id : null;
  const hasFirebaseDb = Boolean(firebaseDb);

  useMetadata({ title: 'Leads' });

  const sortedMembers = React.useMemo(() => {
    return [...(members ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  }, [members]);

  React.useEffect(() => {
    if (!firebaseDb) {
      setIsLoadingLeads(false);
      return;
    }

    if (!user) {
      setLeads([]);
      setIsLoadingLeads(false);
      return;
    }

    setIsLoadingLeads(true);
    let unsubscribe: (() => void) | undefined;

    try {
      const leadsQuery = query(
        collection(firebaseDb, 'leads'),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        leadsQuery,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Lead, 'id'>)
          }));
          setLeads(data as Lead[]);
          setIsLoadingLeads(false);
        },
        (error) => {
          console.error('Erro ao escutar leads:', error);
          toast.error('Nao foi possivel carregar os leads.');
          setIsLoadingLeads(false);
        }
      );
    } catch (error) {
      console.error('Erro ao configurar listener de leads:', error);
      toast.error('Nao foi possivel carregar os leads.');
      setIsLoadingLeads(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  React.useEffect(() => {
    if (!selectedLeadId) return;
    const updatedLead = leads.find((lead) => lead.id === selectedLeadId);
    if (updatedLead) setSelectedLead(updatedLead);
  }, [leads, selectedLeadId]);

  const filteredLeads = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      [
        lead.leadName,
        lead.responsibleName,
        lead.cnpj,
        lead.location,
        lead.proposalLink,
        lead.interestedServices?.join(' '),
        lead.contacts?.map((item) => item.name).join(' '),
        lead.contacts?.map((item) => item.email).join(' '),
        lead.contacts?.map((item) => item.phone).join(' ')
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [leads, searchTerm]);

  const formatLeadDate = (value: unknown) => {
    if (!value) return '-';

    if (typeof value === 'string') {
      const parts = value.split('-');
      if (parts.length !== 3) return value;
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

    if (typeof value === 'object') {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (maybeTimestamp.toDate) {
        const date = maybeTimestamp.toDate();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());
        return `${day}/${month}/${year}`;
      }
    }

    return '-';
  };

  const formatLeadDateInput = (value: unknown) => {
    if (!value) return '';

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (maybeTimestamp.toDate) {
        const date = maybeTimestamp.toDate();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());
        return `${year}-${month}-${day}`;
      }
    }

    return '';
  };

  const formatCommentDate = (value: unknown) => {
    if (!value) return '-';

    if (typeof value === 'object') {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (maybeTimestamp.toDate) {
        return maybeTimestamp.toDate().toLocaleString('pt-BR');
      }
    }

    if (typeof value === 'string') return value;

    return '-';
  };

  const openCreateLead = () => {
    setForm(initialFormState);
    setEditingLeadId(null);
    setIsDialogOpen(true);
  };

  const handleCancelDialog = () => {
    setForm(initialFormState);
    setEditingLeadId(null);
    setIsDialogOpen(false);
  };

  const openEditLead = (lead: Lead) => {
    setForm({
      responsibleId: lead.responsibleId ?? '',
      responsibleName: lead.responsibleName ?? '',
      leadName: lead.leadName ?? '',
      cnpj: lead.cnpj ?? '',
      contacts:
        lead.contacts?.length > 0
          ? lead.contacts.map((contact) => ({
              name: contact.name ?? '',
              email: contact.email ?? '',
              phone: contact.phone ?? '',
              role: contact.role ?? ''
            }))
          : [
              {
                name: '',
                email: '',
                phone: '',
                role: ''
              }
            ],
      date: formatLeadDateInput(lead.date),
      location: lead.location ?? '',
      interestedServices: lead.interestedServices?.join(', ') ?? '',
      proposalLink: lead.proposalLink ?? '',
      hasBeenContacted: lead.hasBeenContacted ?? false
    });
    setEditingLeadId(lead.id);
    setIsDialogOpen(true);
  };

  const handleResponsibleChange = (value: string) => {
    const selected = sortedMembers.find((member) => member.id === value);
    setForm((current) => ({
      ...current,
      responsibleId: value,
      responsibleName: selected?.name ?? ''
    }));
  };

  const handleFieldChange = (field: keyof LeadFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleContactedChange = (value: boolean) => {
    setForm((current) => ({
      ...current,
      hasBeenContacted: value
    }));
  };

  const addContact = () => {
    setForm((current) => ({
      ...current,
      contacts: [
        ...(current.contacts ?? []),
        { name: '', email: '', phone: '', role: '' }
      ]
    }));
  };

  const updateContact = (
    index: number,
    field: keyof LeadContact,
    value: string
  ) => {
    setForm((current) => {
      const next = [...(current.contacts ?? [])];
      if (!next[index]) {
        next[index] = { name: '', email: '', phone: '', role: '' };
      }
      next[index] = {
        ...next[index],
        [field]: value
      };
      return { ...current, contacts: next };
    });
  };

  const removeContact = (index: number) => {
    setForm((current) => {
      const next = (current.contacts ?? []).filter(
        (_, itemIndex) => itemIndex !== index
      );
      return {
        ...current,
        contacts: next.length
          ? next
          : [{ name: '', email: '', phone: '', role: '' }]
      };
    });
  };

  const openDeleteDialog = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) setLeadToDelete(null);
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setCommentText('');
  };

  React.useEffect(() => {
    if (!firebaseDb || !selectedLeadId) {
      setComments([]);
      setIsLoadingComments(false);
      return;
    }

    setIsLoadingComments(true);
    const commentsQuery = query(
      collection(firebaseDb, 'leads', selectedLeadId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<LeadComment, 'id'>)
        }));
        setComments(data as LeadComment[]);
        setIsLoadingComments(false);
      },
      (error) => {
        console.error('Erro ao carregar comentarios:', error);
        toast.error('Nao foi possivel carregar os comentarios.');
        setIsLoadingComments(false);
      }
    );

    return () => unsubscribe();
  }, [selectedLeadId, hasFirebaseDb]);

  const handleDeleteLead = async () => {
    if (!firebaseDb) {
      toast.error('Banco de dados indisponivel.');
      return;
    }

    if (!leadToDelete) {
      setIsDeleteDialogOpen(false);
      return;
    }

    setDeletingLeadId(leadToDelete.id);
    try {
      await deleteDoc(doc(firebaseDb, 'leads', leadToDelete.id));
      toast.success('Lead excluido.');
      setLeadToDelete(null);
      setIsDeleteDialogOpen(false);
      setSelectedLead(null);
    } catch (error) {
      console.log(error);
      toast.error('Nao foi possivel excluir o lead.');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleToggleContacted = async (lead: Lead, value: boolean) => {
    if (!firebaseDb) {
      toast.error('Banco de dados indisponivel.');
      return;
    }

    const previousValue = lead.hasBeenContacted === true;
    setTogglingLeadId(lead.id);
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id ? { ...item, hasBeenContacted: value } : item
      )
    );
    setSelectedLead((current) =>
      current && current.id === lead.id
        ? { ...current, hasBeenContacted: value }
        : current
    );
    try {
      await updateDoc(doc(firebaseDb, 'leads', lead.id), {
        hasBeenContacted: value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.log(error);
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? { ...item, hasBeenContacted: previousValue }
            : item
        )
      );
      setSelectedLead((current) =>
        current && current.id === lead.id
          ? { ...current, hasBeenContacted: previousValue }
          : current
      );
      toast.error('Nao foi possivel atualizar o lead.');
    } finally {
      setTogglingLeadId(null);
    }
  };

  const handleAddComment = async () => {
    if (!firebaseDb || !selectedLeadId) {
      toast.error('Banco de dados indisponivel.');
      return;
    }

    const message = commentText.trim();
    if (!message) {
      toast.error('Digite um comentario antes de salvar.');
      return;
    }

    const authorName =
      user?.displayName || user?.email || 'Usuario nao identificado';

    setIsSavingComment(true);
    try {
      await addDoc(
        collection(firebaseDb, 'leads', selectedLeadId, 'comments'),
        {
          text: message,
          authorId: user?.uid ?? null,
          authorName,
          createdAt: serverTimestamp()
        }
      );
      setCommentText('');
      toast.success('Comentario adicionado.');
    } catch (error) {
      console.log(error);
      toast.error('Nao foi possivel adicionar o comentario.');
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firebaseDb) {
      toast.error('Banco de dados indisponivel.');
      return;
    }

    const contacts = formContacts
      .map((contact) => ({
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        role: contact.role.trim()
      }))
      .filter((contact) =>
        [contact.name, contact.email, contact.phone, contact.role].some(Boolean)
      );

    const interestedServices = form.interestedServices
      .split(',')
      .map((service) => service.trim())
      .filter(Boolean);

    const payload = {
      responsibleId: form.responsibleId.trim(),
      responsibleName: form.responsibleName.trim(),
      leadName: form.leadName.trim(),
      cnpj: form.cnpj.trim(),
      contacts,
      date: form.date.trim(),
      location: form.location.trim(),
      interestedServices,
      proposalLink: form.proposalLink.trim(),
      hasBeenContacted: form.hasBeenContacted
    };

    if (
      !payload.responsibleId ||
      !payload.leadName ||
      !payload.date ||
      !payload.location
    ) {
      toast.error('Preencha todos os campos obrigatorios.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingLeadId) {
        await updateDoc(doc(firebaseDb, 'leads', editingLeadId), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        toast.success('Lead atualizado com sucesso.');
      } else {
        await addDoc(collection(firebaseDb, 'leads'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Lead registrado com sucesso.');
      }
      setForm(initialFormState);
      setEditingLeadId(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.log(error);
      toast.error('Nao foi possivel registrar o lead.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LeadsPageHeader onCreateLead={openCreateLead}>
      <LeadsList
        isLoading={isLoadingLeads}
        leads={filteredLeads}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenLead={openLeadDetails}
        formatLeadDate={formatLeadDate}
      />

      <LeadDetailsDialog
        selectedLead={selectedLead}
        comments={comments}
        isLoadingComments={isLoadingComments}
        commentText={commentText}
        isSavingComment={isSavingComment}
        togglingLeadId={togglingLeadId}
        deletingLeadId={deletingLeadId}
        onClose={() => setSelectedLead(null)}
        onEdit={openEditLead}
        onDelete={openDeleteDialog}
        onToggleContacted={handleToggleContacted}
        onCommentTextChange={setCommentText}
        onAddComment={handleAddComment}
        formatLeadDate={formatLeadDate}
        formatCommentDate={formatCommentDate}
      />

      <LeadFormDialog
        isOpen={isDialogOpen}
        editingLeadId={editingLeadId}
        form={form}
        formContacts={formContacts}
        sortedMembers={sortedMembers}
        isSaving={isSaving}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        onCancel={handleCancelDialog}
        onResponsibleChange={handleResponsibleChange}
        onFieldChange={handleFieldChange}
        onToggleContacted={handleContactedChange}
        onAddContact={addContact}
        onUpdateContact={updateContact}
        onRemoveContact={removeContact}
      />

      <LeadDeleteDialog
        isOpen={isDeleteDialogOpen}
        leadToDelete={leadToDelete}
        isDeleting={deletingLeadId === leadToDelete?.id}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={handleDeleteLead}
      />
    </LeadsPageHeader>
  );
}
