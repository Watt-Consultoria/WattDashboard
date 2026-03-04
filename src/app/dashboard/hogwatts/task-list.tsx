'use client';

import type { HogwattsTask } from '@/types/hogwatts/hogwatts';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface TaskListProps {
  tasks: HogwattsTask[];
  onCreateTask?: () => void;
  isCoordinator?: boolean;
}

export function TaskList({
  tasks,
  onCreateTask,
  isCoordinator
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-sm sm:text-base'>
                Tarefas Disponíveis
              </CardTitle>
              <CardDescription>
                Nenhuma tarefa cadastrada no momento.
              </CardDescription>
            </div>
            {onCreateTask && (
              <Button
                onClick={onCreateTask}
                size='sm'
                className='h-8 gap-1'
                disabled={!isCoordinator}
              >
                <Plus className='h-4 w-4' />
                <span className='hidden sm:inline'>Nova tarefa</span>
                <span className='sm:hidden'>Nova</span>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className='overflow-hidden'>
      <CardHeader className='px-3 pt-3 pb-2 sm:px-6 sm:pt-6 sm:pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-sm sm:text-base'>
              Tarefas Disponíveis
            </CardTitle>
            <CardDescription className='text-xs'>
              {tasks.length} tarefa(s) disponível(is)
            </CardDescription>
          </div>
          {onCreateTask && (
            <Button
              onClick={onCreateTask}
              size='sm'
              className='h-8 gap-1'
              disabled={!isCoordinator}
            >
              <Plus className='h-4 w-4' />
              <span className='hidden sm:inline'>Nova tarefa</span>
              <span className='sm:hidden'>Nova</span>
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Desktop */}
      <CardContent className='hidden p-0 sm:block md:p-6'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className='text-right'>Pontos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className='font-medium'>{task.name}</TableCell>
                  <TableCell className='max-w-xs truncate'>
                    {task.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{task.sector}</Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Badge variant='secondary'>{task.points} pts</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Mobile */}
      <CardContent className='block p-2 sm:hidden'>
        <div className='space-y-2'>
          {tasks.map((task) => (
            <div
              key={task.id}
              className='flex items-center justify-between rounded-lg border p-3'
            >
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold'>{task.name}</p>
                <p className='text-muted-foreground line-clamp-1 text-xs'>
                  {task.description}
                </p>
                <p className='text-muted-foreground mt-0.5 text-[11px]'>
                  {task.sector}
                </p>
              </div>
              <Badge variant='secondary' className='ml-2 shrink-0'>
                {task.points} pts
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
