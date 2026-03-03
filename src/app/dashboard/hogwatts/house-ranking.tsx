'use client';

import type { HogwattsHouse } from '@/types/hogwatts/hogwatts';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HouseRankingProps {
  houses: HogwattsHouse[];
}

const houseColors: Record<string, string> = {
  Nexus: 'from-blue-500 to-blue-700',
  Lumina: 'from-amber-400 to-amber-600',
  Voltus: 'from-emerald-500 to-emerald-700'
};

const houseBorderColors: Record<string, string> = {
  Nexus: 'border-blue-500/40',
  Lumina: 'border-amber-500/40',
  Voltus: 'border-emerald-500/40'
};

const trophyColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];

export function HouseRanking({ houses }: HouseRankingProps) {
  const sorted = [...houses].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      {sorted.map((house, idx) => (
        <Card
          key={house.id}
          className={`relative overflow-hidden border-2 ${houseBorderColors[house.name] ?? ''}`}
        >
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-linear-to-r ${houseColors[house.name] ?? 'from-gray-400 to-gray-600'}`}
          />
          <CardHeader className='flex flex-row items-center gap-3 pb-2'>
            <Trophy
              className={`h-5 w-5 shrink-0 ${trophyColors[idx] ?? 'text-muted-foreground'}`}
            />
            <div>
              <CardTitle className='text-base'>{house.name}</CardTitle>
              <p className='text-muted-foreground text-xs'>
                {idx === 0 ? '1º Lugar' : idx === 1 ? '2º Lugar' : '3º Lugar'}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold tabular-nums'>
              {house.totalPoints}
              <span className='text-muted-foreground ml-1 text-sm font-normal'>
                pontos
              </span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
