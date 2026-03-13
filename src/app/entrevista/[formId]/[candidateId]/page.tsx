'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClock,
  faCheck,
  faSpinner,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AvailableSlot {
  id: string;
  slotIds: string[];
  interviewerNames: string[];
  isoDate: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
}

interface BookedSlotInfo {
  dateLabel: string;
  startTime: string;
  endTime: string;
  interviewerNames?: string[];
}

type PageState =
  | 'loading'
  | 'loaded'
  | 'empty'
  | 'booking'
  | 'success'
  | 'error'
  | 'already-booked';

export default function InterviewSelectionPage() {
  const params = useParams<{ formId: string; candidateId: string }>();
  const formId = params.formId;
  const candidateId = params.candidateId;

  const [state, setState] = React.useState<PageState>('loading');
  const [slots, setSlots] = React.useState<AvailableSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(
    null
  );
  const [bookedSlot, setBookedSlot] = React.useState<BookedSlotInfo | null>(
    null
  );
  const [candidateName, setCandidateName] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const showFinalDayWarning = state !== 'success' && state !== 'already-booked';

  React.useEffect(() => {
    if (!formId || !candidateId) return;

    async function fetchSlots() {
      try {
        const res = await fetch(
          `/api/interview/available-slots?formId=${encodeURIComponent(formId)}&candidateId=${encodeURIComponent(candidateId)}`
        );
        const data = await res.json();

        if (!res.ok) {
          if (data.alreadyBooked) {
            setBookedSlot(data.bookedSlot ?? null);
            setState('already-booked');
          } else {
            setErrorMessage(
              data.error ?? 'Erro ao carregar horários disponíveis.'
            );
            setState('error');
          }
          return;
        }

        setCandidateName(data.candidateName ?? '');
        const fetchedSlots = (data.slots ?? []) as AvailableSlot[];

        const filteredSlots = fetchedSlots.filter((slot) => {
          const slotDate = new Date(`${slot.isoDate}T${slot.endTime}:00`);
          return slotDate > new Date(Date.now() + 60 * 60 * 1000); // Filtrar slots com menos de 1 hora para o início, para evitar agendamento em cima da hora
        });

        setSlots(filteredSlots);
        setState(filteredSlots.length > 0 ? 'loaded' : 'empty');
      } catch {
        setErrorMessage('Erro de conexão. Tente novamente mais tarde.');
        setState('error');
      }
    }

    fetchSlots();
  }, [formId, candidateId]);

  async function handleBook() {
    if (!selectedSlotId) return;

    setState('booking');

    const selectedSlot = slots.find((s) => s.id === selectedSlotId);
    if (!selectedSlot) {
      setErrorMessage('Horário não encontrado.');
      setState('error');
      return;
    }

    try {
      const res = await fetch('/api/interview/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          slotIds: selectedSlot.slotIds,
          candidateId,
          candidateName: candidateName || 'Candidato'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.error ?? 'Erro ao reservar horário. Tente novamente.'
        );
        setState('error');
        return;
      }

      setBookedSlot(data.slot ?? null);
      setState('success');
    } catch {
      setErrorMessage('Erro de conexão. Tente novamente mais tarde.');
      setState('error');
    }
  }

  // Agrupar slots por data
  const groupedSlots = React.useMemo(() => {
    const grouped = new Map<string, AvailableSlot[]>();
    for (const slot of slots) {
      const group = grouped.get(slot.isoDate) ?? [];
      group.push(slot);
      grouped.set(slot.isoDate, group);
    }
    return grouped;
  }, [slots]);

  return (
    <div className='flex min-h-dvh items-center justify-center bg-linear-to-b from-zinc-50 to-zinc-100 px-3 py-6 sm:p-4 dark:from-zinc-950 dark:to-zinc-900'>
      <Card className='w-full max-w-lg shadow-lg'>
        <CardHeader className='px-4 text-center sm:px-6'>
          <div className='mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-100 sm:size-14 dark:bg-amber-900/30'>
            <FontAwesomeIcon
              icon={faCalendarDays}
              className='size-5 text-amber-600 sm:size-6 dark:text-amber-400'
            />
          </div>
          <CardTitle className='text-lg sm:text-xl'>
            Agendamento de Entrevista
          </CardTitle>
          <CardDescription className='text-xs sm:text-sm'>
            Processo Seletivo — Watt Consultoria Jr.
          </CardDescription>
        </CardHeader>

        <CardContent className='px-4 sm:px-6'>
          {showFinalDayWarning && (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'>
              <p className='flex items-start gap-2'>
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className='mt-0.5 size-4 shrink-0'
                />
                <span>
                  Atenção: hoje é o último dia de inscrições. Se não houver
                  entrevistadores disponíveis, o candidato será desclassificado.
                </span>
              </p>
            </div>
          )}

          {/* LOADING */}
          {state === 'loading' && (
            <div className='flex flex-col items-center gap-3 py-8'>
              <FontAwesomeIcon
                icon={faSpinner}
                className='size-8 animate-spin text-amber-500'
              />
              <p className='text-muted-foreground text-sm'>
                Carregando horários disponíveis…
              </p>
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div className='flex flex-col items-center gap-3 py-8 text-center'>
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className='size-8 text-red-500'
              />
              <p className='text-sm text-red-600 dark:text-red-400'>
                {errorMessage}
              </p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {/* EMPTY */}
          {state === 'empty' && (
            <div className='flex flex-col items-center gap-3 py-8 text-center'>
              <FontAwesomeIcon
                icon={faCalendarDays}
                className='size-8 text-zinc-400'
              />
              <p className='text-muted-foreground text-sm'>
                Não há horários disponíveis no momento. Entre em contato com a
                equipe de seleção.
              </p>
            </div>
          )}

          {/* ALREADY BOOKED */}
          {state === 'already-booked' && (
            <div className='flex flex-col items-center gap-4 py-6 text-center'>
              <div className='flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
                <FontAwesomeIcon
                  icon={faCheck}
                  className='size-7 text-green-600 dark:text-green-400'
                />
              </div>
              <div>
                <p className='mb-1 text-base font-semibold text-green-700 dark:text-green-400'>
                  Você já possui uma entrevista agendada!
                </p>
                {bookedSlot && (
                  <div className='mt-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800'>
                    <p className='text-sm font-medium'>
                      {bookedSlot.dateLabel}
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      {bookedSlot.startTime} – {bookedSlot.endTime}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLOT SELECTION */}
          {(state === 'loaded' || state === 'booking') && (
            <div className='space-y-4'>
              {candidateName && (
                <p className='text-muted-foreground text-sm'>
                  Olá, <strong>{candidateName}</strong>! Escolha o melhor
                  horário para a sua entrevista:
                </p>
              )}

              <div className='-mx-1 max-h-[30vh] space-y-3 overflow-y-auto px-1 sm:max-h-50'>
                {Array.from(groupedSlots.entries()).map(
                  ([isoDate, dateSlots]) => (
                    <div key={isoDate}>
                      <p className='mb-2 flex items-center gap-1.5 text-sm font-semibold'>
                        <FontAwesomeIcon
                          icon={faCalendarDays}
                          className='size-3.5 text-amber-500'
                        />
                        {dateSlots[0].dateLabel}
                      </p>
                      <div className='space-y-1.5'>
                        {dateSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type='button'
                            disabled={state === 'booking'}
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={cn(
                              'flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3',
                              selectedSlotId === slot.id
                                ? 'border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/20'
                                : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                            )}
                          >
                            <div className='flex items-center gap-2'>
                              <FontAwesomeIcon
                                icon={faClock}
                                className='text-muted-foreground size-3.5'
                              />
                              <span className='font-medium'>
                                {slot.startTime} – {slot.endTime}
                              </span>
                              {selectedSlotId === slot.id && (
                                <Badge
                                  variant='outline'
                                  className='ml-auto border-amber-500 text-amber-600 dark:text-amber-400'
                                >
                                  Selecionado
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>

              <Button
                className='w-full'
                disabled={!selectedSlotId || state === 'booking'}
                onClick={handleBook}
              >
                {state === 'booking' ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className='mr-2 size-4 animate-spin'
                    />
                    Reservando…
                  </>
                ) : (
                  'Confirmar horário'
                )}
              </Button>
            </div>
          )}

          {/* SUCCESS */}
          {state === 'success' && (
            <div className='flex flex-col items-center gap-4 py-6 text-center'>
              <div className='flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
                <FontAwesomeIcon
                  icon={faCheck}
                  className='size-7 text-green-600 dark:text-green-400'
                />
              </div>
              <div>
                <p className='mb-1 text-base font-semibold text-green-700 dark:text-green-400'>
                  Horário reservado com sucesso!
                </p>
                {bookedSlot && (
                  <div className='mt-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800'>
                    <p className='text-sm font-medium'>
                      {bookedSlot.dateLabel}
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      {bookedSlot.startTime} – {bookedSlot.endTime}
                    </p>
                  </div>
                )}
                <p className='text-muted-foreground mt-3 text-sm'>
                  Você receberá um email de confirmação com o link para a
                  videoconferência. Fique atento(a) à sua caixa de entrada!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
