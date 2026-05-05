'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  Bold,
  Code2,
  Eye,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  Plus,
  Quote,
  Save,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { firebaseDb, firebaseStorage } from '@/lib/firebase/client';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { isExecutiveAssessor } from '@/lib/executive-permissions';
import useMetadata from '@/hooks/use-metadata';
import type { Tutorial } from '@/types/tutorial/tutorial';
import { MarkdownViewer } from '@/components/tutorials/markdown-viewer';

type TutorialForm = {
  title: string;
  summary: string;
  content: string;
  isPublished: boolean;
};

const emptyForm: TutorialForm = {
  title: '',
  summary: '',
  content: '',
  isPublished: true
};

const getTimestampMillis = (tutorial: Tutorial) =>
  tutorial.updatedAt?.toMillis?.() ?? tutorial.createdAt?.toMillis?.() ?? 0;

export default function EditTutoriaisPage() {
  const router = useRouter();
  const { currentMember, isLoading } = useFirebaseData();
  const [tutorials, setTutorials] = React.useState<Tutorial[]>([]);
  const [selectedTutorialId, setSelectedTutorialId] = React.useState('');
  const [form, setForm] = React.useState<TutorialForm>(emptyForm);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  useMetadata({ title: 'Editar tutoriais' });

  const canManageTutorials = isExecutiveAssessor(currentMember);
  const selectedTutorial =
    tutorials.find((tutorial) => tutorial.id === selectedTutorialId) ?? null;

  React.useEffect(() => {
    if (!isLoading && !canManageTutorials) {
      toast.error('Apenas Assessor do Executivo pode editar tutoriais.');
      router.push('/dashboard/tutoriais');
    }
  }, [canManageTutorials, isLoading, router]);

  React.useEffect(() => {
    if (!firebaseDb) return;

    const tutorialsQuery = query(
      collection(firebaseDb, 'tutorials'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(tutorialsQuery, (snapshot) => {
      const nextTutorials = snapshot.docs.map(
        (docSnapshot) =>
          ({
            id: docSnapshot.id,
            ...docSnapshot.data()
          }) as Tutorial
      );

      setTutorials(nextTutorials);
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!selectedTutorial) return;

    setForm({
      title: selectedTutorial.title,
      summary: selectedTutorial.summary,
      content: selectedTutorial.content,
      isPublished: selectedTutorial.isPublished
    });
  }, [selectedTutorial]);

  const sortedTutorials = React.useMemo(
    () =>
      [...tutorials].sort(
        (a, b) => getTimestampMillis(b) - getTimestampMillis(a)
      ),
    [tutorials]
  );

  const startNewTutorial = () => {
    setSelectedTutorialId('');
    setForm(emptyForm);
    textareaRef.current?.focus();
  };

  const updateContent = (nextContent: string) => {
    setForm((current) => ({ ...current, content: nextContent }));
  };

  const insertMarkdown = (before: string, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateContent(`${form.content}${before}${placeholder}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = form.content.slice(start, end) || placeholder;
    const nextContent =
      form.content.slice(0, start) +
      before +
      selectedText +
      after +
      form.content.slice(end);

    updateContent(nextContent);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!firebaseStorage) {
      toast.error('Firebase Storage nao esta configurado.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const extension = file.name.includes('.')
        ? file.name.slice(file.name.lastIndexOf('.'))
        : '';
      const fileId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const storagePath = `tutorials/${fileId}${extension}`;
      const storageRef = ref(firebaseStorage, storagePath);

      await uploadBytes(storageRef, file, {
        contentType: file.type
      });

      const url = await getDownloadURL(storageRef);
      insertMarkdown(`\n![${file.name}](${url})\n`);
      toast.success('Imagem anexada ao tutorial.');
    } catch (error) {
      console.error('Erro ao enviar imagem do tutorial:', error);
      toast.error('Nao foi possivel anexar a imagem.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!firebaseDb) return;

    if (!canManageTutorials || !currentMember?.id) {
      toast.error('Voce nao tem permissao para salvar tutoriais.');
      return;
    }

    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Preencha titulo e conteudo.');
      return;
    }

    setIsSaving(true);
    try {
      const now = Timestamp.now();
      const tutorialRef = selectedTutorialId
        ? doc(firebaseDb, 'tutorials', selectedTutorialId)
        : doc(collection(firebaseDb, 'tutorials'));

      const imageUrls = Array.from(
        form.content.matchAll(/!\[[^\]]*]\(([^)]+)\)/g),
        (match) => match[1]
      );

      await setDoc(
        tutorialRef,
        {
          id: tutorialRef.id,
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content,
          imageUrls,
          isPublished: form.isPublished,
          createdAt: selectedTutorial?.createdAt ?? now,
          updatedAt: now,
          createdByMemberId:
            selectedTutorial?.createdByMemberId ?? currentMember.id,
          createdByMemberName:
            selectedTutorial?.createdByMemberName ?? currentMember.name ?? ''
        },
        { merge: true }
      );

      setSelectedTutorialId(tutorialRef.id);
      toast.success('Tutorial salvo.');
    } catch (error) {
      console.error('Erro ao salvar tutorial:', error);
      toast.error('Nao foi possivel salvar o tutorial.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firebaseDb || !selectedTutorialId) return;
    if (!canManageTutorials) {
      toast.error('Voce nao tem permissao para remover tutoriais.');
      return;
    }

    const shouldDelete = window.confirm('Remover este tutorial?');
    if (!shouldDelete) return;

    try {
      await deleteDoc(doc(firebaseDb, 'tutorials', selectedTutorialId));
      startNewTutorial();
      toast.success('Tutorial removido.');
    } catch (error) {
      console.error('Erro ao remover tutorial:', error);
      toast.error('Nao foi possivel remover o tutorial.');
    }
  };

  return (
    <PageContainer>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col justify-between gap-3 md:flex-row md:items-center'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Editar tutoriais
            </h1>
            <p className='text-muted-foreground'>
              Crie conteudos em Markdown, anexe imagens e publique para os
              membros.
            </p>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.push('/dashboard/tutoriais')}
            >
              Voltar para leitura
            </Button>
            <Button type='button' className='gap-2' onClick={startNewTutorial}>
              <Plus className='h-4 w-4' />
              Novo tutorial
            </Button>
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'>
          <Card className='xl:sticky xl:top-4 xl:h-[calc(100dvh-8rem)]'>
            <CardHeader>
              <CardTitle className='text-lg'>Tutoriais</CardTitle>
              <CardDescription>
                Selecione um item para editar ou crie um novo.
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='h-72 px-4 pb-4 xl:h-[calc(100dvh-18rem)]'>
                {sortedTutorials.length === 0 ? (
                  <div className='text-muted-foreground py-10 text-center text-sm'>
                    Nenhum tutorial criado.
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {sortedTutorials.map((tutorial) => (
                      <button
                        key={tutorial.id}
                        type='button'
                        onClick={() => setSelectedTutorialId(tutorial.id)}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                          selectedTutorialId === tutorial.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/60'
                        }`}
                      >
                        <div className='line-clamp-2 text-sm font-medium'>
                          {tutorial.title}
                        </div>
                        <Badge
                          variant={tutorial.isPublished ? 'default' : 'secondary'}
                          className='mt-2'
                        >
                          {tutorial.isPublished ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <div className='grid min-w-0 gap-4 2xl:grid-cols-2'>
            <Card className='min-w-0'>
              <CardHeader>
                <CardTitle className='text-xl'>Conteudo</CardTitle>
                <CardDescription>
                  Use Markdown para estruturar titulos, listas, links, imagens
                  e destaques.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Titulo</label>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    placeholder='Ex: Como registrar horas no ponto'
                  />
                </div>

                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Resumo</label>
                  <Textarea
                    value={form.summary}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        summary: event.target.value
                      }))
                    }
                    placeholder='Resumo curto para a lista de tutoriais.'
                    className='min-h-20 resize-none'
                  />
                </div>

                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => insertMarkdown('# ', '', 'Titulo')}
                    className='gap-2'
                  >
                    <Heading1 className='h-4 w-4' />
                    H1
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => insertMarkdown('## ', '', 'Subtitulo')}
                    className='gap-2'
                  >
                    <Heading2 className='h-4 w-4' />
                    H2
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => insertMarkdown('**', '**', 'negrito')}
                    className='gap-2'
                  >
                    <Bold className='h-4 w-4' />
                    Negrito
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => insertMarkdown('*', '*', 'italico')}
                    className='gap-2'
                  >
                    <Italic className='h-4 w-4' />
                    Italico
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      insertMarkdown('[', '](https://exemplo.com)', 'link')
                    }
                    className='gap-2'
                  >
                    <LinkIcon className='h-4 w-4' />
                    Link
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => insertMarkdown('- ', '', 'item da lista')}
                    className='gap-2'
                  >
                    <List className='h-4 w-4' />
                    Lista
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => insertMarkdown('> ', '', 'citacao')}
                    className='gap-2'
                  >
                    <Quote className='h-4 w-4' />
                    Citacao
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      insertMarkdown('```\n', '\n```', 'codigo aqui')
                    }
                    className='gap-2'
                  >
                    <Code2 className='h-4 w-4' />
                    Codigo
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={isUploadingImage}
                    className='relative gap-2 overflow-hidden'
                  >
                    <ImagePlus className='h-4 w-4' />
                    {isUploadingImage ? 'Enviando...' : 'Imagem'}
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className='absolute inset-0 cursor-pointer opacity-0'
                    />
                  </Button>
                </div>

                <div className='grid gap-2'>
                  <label className='text-sm font-medium'>Markdown</label>
                  <Textarea
                    ref={textareaRef}
                    value={form.content}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        content: event.target.value
                      }))
                    }
                    placeholder={'# Titulo\\n\\nEscreva o tutorial aqui...'}
                    className='min-h-[42vh] resize-y font-mono text-sm'
                  />
                </div>

                <div className='flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center'>
                  <label className='flex items-center gap-2 text-sm'>
                    <Checkbox
                      checked={form.isPublished}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isPublished: checked === true
                        }))
                      }
                    />
                    Publicado para os membros
                  </label>

                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <Button
                      type='button'
                      variant='destructive'
                      onClick={handleDelete}
                      disabled={!selectedTutorialId || isSaving}
                      className='gap-2'
                    >
                      <Trash2 className='h-4 w-4' />
                      Remover
                    </Button>
                    <Button
                      type='button'
                      onClick={handleSave}
                      disabled={isSaving}
                      className='gap-2'
                    >
                      <Save className='h-4 w-4' />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='min-w-0'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-xl'>
                  <Eye className='h-5 w-5' />
                  Pre-visualizacao
                </CardTitle>
                <CardDescription>
                  Aparencia aproximada do tutorial publicado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {form.content.trim() ? (
                  <MarkdownViewer content={form.content} />
                ) : (
                  <div className='text-muted-foreground flex min-h-72 items-center justify-center rounded-md border text-center text-sm'>
                    A pre-visualizacao aparece conforme o Markdown for escrito.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
