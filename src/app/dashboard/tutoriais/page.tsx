'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { BookOpen, Edit, Search } from 'lucide-react';
import { format } from 'date-fns';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { firebaseDb } from '@/lib/firebase/client';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { isDiretoria, isExecutiveAssessor } from '@/lib/executive-permissions';
import useMetadata from '@/hooks/use-metadata';
import type { Tutorial } from '@/types/tutorial/tutorial';
import { MarkdownViewer } from '@/components/tutorials/markdown-viewer';

const getTutorialDate = (tutorial: Tutorial) =>
  tutorial.updatedAt?.toDate?.() ?? tutorial.createdAt?.toDate?.() ?? new Date();

export default function TutoriaisPage() {
  const router = useRouter();
  const { currentMember } = useFirebaseData();
  const [tutorials, setTutorials] = React.useState<Tutorial[]>([]);
  const [selectedTutorialId, setSelectedTutorialId] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  useMetadata({ title: 'Tutoriais' });

  const canManageTutorials =
    isExecutiveAssessor(currentMember) || isDiretoria(currentMember);

  React.useEffect(() => {
    if (!firebaseDb) {
      setIsLoading(false);
      return;
    }

    const tutorialsQuery = query(
      collection(firebaseDb, 'tutorials'),
      where('isPublished', '==', true)
    );

    const unsubscribe = onSnapshot(
      tutorialsQuery,
      (snapshot) => {
        const nextTutorials = snapshot.docs.map(
          (docSnapshot) =>
            ({
              id: docSnapshot.id,
              ...docSnapshot.data()
            }) as Tutorial
        );

        setTutorials(
          nextTutorials.sort(
            (a, b) =>
              (b.updatedAt?.toMillis?.() ?? 0) -
              (a.updatedAt?.toMillis?.() ?? 0)
          )
        );
        setSelectedTutorialId((current) => current || nextTutorials[0]?.id || '');
        setIsLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar tutoriais:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredTutorials = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tutorials;

    return tutorials.filter(
      (tutorial) =>
        tutorial.title.toLowerCase().includes(term) ||
        tutorial.summary.toLowerCase().includes(term) ||
        tutorial.content.toLowerCase().includes(term)
    );
  }, [searchTerm, tutorials]);

  const selectedTutorial =
    filteredTutorials.find((tutorial) => tutorial.id === selectedTutorialId) ??
    filteredTutorials[0] ??
    null;

  React.useEffect(() => {
    if (
      selectedTutorialId &&
      !filteredTutorials.some((tutorial) => tutorial.id === selectedTutorialId)
    ) {
      setSelectedTutorialId(filteredTutorials[0]?.id || '');
    }
  }, [filteredTutorials, selectedTutorialId]);

  return (
    <PageContainer>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col justify-between gap-3 md:flex-row md:items-center'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Tutoriais</h1>
            <p className='text-muted-foreground'>
              Conteudos internos para consulta, leitura e aprendizado dos
              membros.
            </p>
          </div>

          {canManageTutorials && (
            <Button
              type='button'
              className='gap-2'
              onClick={() => router.push('/dashboard/tutoriais/editar')}
            >
              <Edit className='h-4 w-4' />
              Editar tutoriais
            </Button>
          )}
        </div>

        <div className='grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]'>
          <Card className='min-w-0 lg:sticky lg:top-4 lg:h-[calc(100dvh-8rem)]'>
            <CardHeader className='space-y-3 px-4 py-4 sm:px-6'>
              <div>
                <CardTitle className='text-lg'>Disponiveis</CardTitle>
                <CardDescription>
                  {filteredTutorials.length} tutorial(is)
                </CardDescription>
              </div>
              <div className='relative'>
                <Search className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder='Buscar tutorial...'
                  className='pl-8'
                />
              </div>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='max-h-[45dvh] px-4 pb-4 lg:h-[calc(100dvh-18rem)] lg:max-h-none'>
                {isLoading ? (
                  <div className='text-muted-foreground py-10 text-center text-sm'>
                    Carregando tutoriais...
                  </div>
                ) : filteredTutorials.length === 0 ? (
                  <div className='text-muted-foreground py-10 text-center text-sm'>
                    Nenhum tutorial disponivel.
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {filteredTutorials.map((tutorial) => (
                      <button
                        key={tutorial.id}
                        type='button'
                        onClick={() => setSelectedTutorialId(tutorial.id)}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${
                          selectedTutorial?.id === tutorial.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/60'
                        }`}
                      >
                        <div className='line-clamp-2 text-sm font-medium'>
                          {tutorial.title}
                        </div>
                        {tutorial.summary && (
                          <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                            {tutorial.summary}
                          </p>
                        )}
                        <div className='text-muted-foreground mt-2 text-xs'>
                          {format(getTutorialDate(tutorial), 'dd/MM/yyyy')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className='min-w-0 overflow-hidden'>
            {selectedTutorial ? (
              <CardContent className='px-4 py-4 sm:px-6 sm:py-5'>
                <MarkdownViewer content={selectedTutorial.content} />
              </CardContent>
            ) : (
              <CardContent className='flex min-h-[48vh] flex-col items-center justify-center gap-3 px-4 text-center sm:min-h-[60vh]'>
                <BookOpen className='text-muted-foreground h-10 w-10' />
                <div>
                  <h2 className='font-semibold'>Nenhum tutorial selecionado</h2>
                  <p className='text-muted-foreground text-sm'>
                    Selecione um item da lista para ler o conteudo.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
