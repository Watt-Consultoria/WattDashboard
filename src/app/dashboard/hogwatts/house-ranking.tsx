'use client';

import type {
  HogwattsHouse,
  HogwattsHouseName,
  HogwattsHouseTopMember
} from '@/types/hogwatts/hogwatts';
import { Trophy, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HouseRankingProps {
  houses: HogwattsHouse[];
  topMembers: Record<HogwattsHouseName, HogwattsHouseTopMember[]>;
}

const houseColors: Record<string, string> = {
  Nexus: 'bg-[#23242d]',
  Lumina: 'bg-white',
  Voltus: 'bg-[#0a92ec]'
};

const houseBorderColors: Record<string, string> = {
  Nexus: 'border-[#23242d]/40',
  Lumina: 'border-white/40',
  Voltus: 'border-[#0a92ec]/40'
};

const trophyColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];
const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export function HouseRanking({ houses, topMembers }: HouseRankingProps) {
  const sorted = [...houses].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className='grid gap-4 sm:grid-cols-3'>
      {sorted.map((house, idx) => {
        const members = topMembers[house.name] ?? [];
        return (
          <Card
            key={house.id}
            className={`relative overflow-hidden border-2 ${houseBorderColors[house.name] ?? ''}`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-1.5 ${houseColors[house.name]}`}
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
            <CardContent className='space-y-3'>
              <p className='text-3xl font-bold tabular-nums'>
                {house.totalPoints}
                <span className='text-muted-foreground ml-1 text-sm font-normal'>
                  pontos
                </span>
              </p>

              {members.length > 0 && (
                <div className='border-t pt-3'>
                  <p className='text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase'>
                    Top membros
                  </p>
                  <ul className='space-y-1.5'>
                    {members.map((m, mIdx) => (
                      <li
                        key={m.memberId}
                        className='flex items-center justify-between text-sm'
                      >
                        <span className='flex items-center gap-1.5 truncate'>
                          <Medal
                            className={`h-3.5 w-3.5 shrink-0 ${medalColors[mIdx] ?? 'text-muted-foreground'}`}
                          />
                          <span className='truncate'>{m.memberName}</span>
                        </span>
                        <span className='text-muted-foreground ml-2 shrink-0 text-xs tabular-nums'>
                          {m.totalPoints} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
