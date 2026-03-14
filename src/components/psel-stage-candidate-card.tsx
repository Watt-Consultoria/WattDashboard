'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  PselStageVoteType,
  StageEvaluationCandidateView
} from '@/types/candidate/stage-evaluation';

interface PselStageCandidateCardProps {
  candidate: StageEvaluationCandidateView;
  disabled?: boolean;
  isSubmitting?: boolean;
  onVote: (voteType: PselStageVoteType) => void | Promise<void>;
}

const SWIPE_THRESHOLD = 96;

export function PselStageCandidateCard({
  candidate,
  disabled,
  isSubmitting,
  onVote
}: PselStageCandidateCardProps) {
  const [offsetX, setOffsetX] = React.useState(0);
  const startXRef = React.useRef<number | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);

  const draggingVote: PselStageVoteType | null =
    offsetX <= -36 ? 'positivo' : offsetX >= 36 ? 'negativo' : null;

  const isBlocked = Boolean(disabled || isSubmitting);

  const resetDrag = React.useCallback(() => {
    startXRef.current = null;
    pointerIdRef.current = null;
    setOffsetX(0);
  }, []);

  const trySubmitVote = React.useCallback(
    async (voteType: PselStageVoteType) => {
      if (isBlocked) return;
      await onVote(voteType);
      resetDrag();
    },
    [isBlocked, onVote, resetDrag]
  );

  return (
    <Card className='w-full overflow-hidden'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='space-y-1'>
            <CardTitle className='text-base'>{candidate.nomeCompleto}</CardTitle>
            <p className='text-muted-foreground text-xs'>
              {candidate.curso} | {candidate.periodo} periodo
            </p>
          </div>
          <Badge variant='outline' className='text-[11px]'>
            Saldo {candidate.resumo.saldo >= 0 ? '+' : ''}
            {candidate.resumo.saldo}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div
          role='button'
          tabIndex={0}
          onPointerDown={(event) => {
            if (isBlocked) return;
            startXRef.current = event.clientX;
            pointerIdRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (isBlocked) return;
            if (
              pointerIdRef.current !== event.pointerId ||
              startXRef.current === null
            ) {
              return;
            }

            const delta = event.clientX - startXRef.current;
            setOffsetX(Math.max(Math.min(delta, 180), -180));
          }}
          onPointerUp={async (event) => {
            if (isBlocked) return;
            if (pointerIdRef.current !== event.pointerId) return;

            event.currentTarget.releasePointerCapture(event.pointerId);

            if (offsetX <= -SWIPE_THRESHOLD) {
              await trySubmitVote('positivo');
              return;
            }

            if (offsetX >= SWIPE_THRESHOLD) {
              await trySubmitVote('negativo');
              return;
            }

            resetDrag();
          }}
          onPointerCancel={resetDrag}
          onKeyDown={async (event) => {
            if (isBlocked) return;
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              await trySubmitVote('positivo');
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              await trySubmitVote('negativo');
            }
          }}
          className='relative touch-pan-y select-none'
          aria-label={`Avaliar ${candidate.nomeCompleto}`}
        >
          <div className='bg-muted h-64 overflow-hidden rounded-xl border'>
            <div
              className='h-full w-full transition-transform duration-200 ease-out'
              style={{
                transform: `translateX(${offsetX}px) rotate(${offsetX / 20}deg)`
              }}
            >
              <div className='relative h-full w-full'>
                {candidate.imagemUrl ? (
                  <Image
                    src={candidate.imagemUrl}
                    alt={candidate.nomeCompleto}
                    fill
                    sizes='(max-width: 768px) 90vw, 420px'
                    className='object-cover'
                  />
                ) : (
                  <div className='bg-muted-foreground/10 flex h-full items-center justify-center'>
                    <span className='text-muted-foreground text-sm'>
                      Sem foto
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='pointer-events-none absolute inset-0 flex items-center justify-between px-4'>
            <span
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-semibold transition-opacity',
                draggingVote === 'positivo'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700 opacity-100'
                  : 'opacity-0'
              )}
            >
              POSITIVO
            </span>
            <span
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-semibold transition-opacity',
                draggingVote === 'negativo'
                  ? 'border-rose-500 bg-rose-500/20 text-rose-700 opacity-100'
                  : 'opacity-0'
              )}
            >
              NEGATIVO
            </span>
          </div>
        </div>

        <p className='text-muted-foreground text-center text-xs'>
          Arraste para a esquerda = <b>positivo</b> | direita = <b>negativo</b>
        </p>

        <div className='grid grid-cols-2 gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => trySubmitVote('positivo')}
            disabled={isBlocked}
            className='border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          >
            Positivo
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => trySubmitVote('negativo')}
            disabled={isBlocked}
            className='border-rose-200 text-rose-700 hover:bg-rose-50'
          >
            Negativo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
