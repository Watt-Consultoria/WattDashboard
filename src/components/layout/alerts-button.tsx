'use client';

import * as React from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { useAuth } from '@/features/auth/components/auth-provider';
import { useFirebaseData } from '@/contexts/firebase-data-context';
import { useFcmToken } from '@/hooks/use-fcm';
import { firebaseDb } from '@/lib/firebase/client';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';
import { toast } from 'sonner';

type Alert = {
  id: string;
  title: string;
  detail: string;
  time: string;
  level: 'baixo' | 'médio' | 'alto';
};

const alertLevelStyles = {
  baixo: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  médio: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  alto: 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
};

export function AlertsButton() {
  const [isActivating, setIsActivating] = React.useState(false);
  const [isDeletingAlert, setIsDeletingAlert] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [token, tryActtivateNotifications] = useFcmToken();
  const { user } = useAuth();
  const { members } = useFirebaseData();

  const currentMember = React.useMemo(() => {
    if (!user?.uid) return null;
    return members.find((m) => m.id === user.uid);
  }, [user?.uid, members]);

  const alerts: Alert[] = React.useMemo(() => {
    if (!currentMember || !(currentMember as any).alerts) return [];
    return (currentMember as any).alerts || [];
  }, [currentMember]);

  if (!user) return null;

  const handleActivateNotifications = async () => {
    setIsActivating(true);
    try {
      await tryActtivateNotifications();
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    if (!firebaseDb) {
      toast.error('Firebase não está inicializado.');
      return;
    }

    const memberRef = doc(firebaseDb, 'members', currentMember!.id);
    const updatedAlerts = alerts.filter((alert) => alert.id !== alertId);

    setIsDeletingAlert(true);

    try {
      setDoc(memberRef, { alerts: updatedAlerts }, { merge: true });
    } catch (error) {
      console.error('Erro ao deletar alerta:', error);
      toast.error('Erro ao deletar alerta.');
    } finally {
      setIsDeletingAlert(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='icon' className='relative'>
          <Bell className='h-4 w-4' />
          {alerts.length > 0 && (
            <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white'>
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='end'>
        <div className='space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <h4 className='text-sm font-medium'>Alertas</h4>
            <Button
              onClick={handleActivateNotifications}
              disabled={isActivating}
              size='sm'
            >
              Ativar notificações
            </Button>
          </div>
          <ScrollArea className='h-64'>
            <div className='space-y-2 pr-3'>
              {alerts.length === 0 ? (
                <div className='text-muted-foreground py-4 text-center text-sm'>
                  Nenhum alerta
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className='flex items-start justify-between gap-3 rounded-md border p-3'
                  >
                    <div className='flex flex-col'>
                      <span className='text-sm font-medium'>{alert.title}</span>
                      <span className='text-muted-foreground text-xs'>
                        {alert.detail}
                      </span>
                      <span className='text-muted-foreground text-xs'>
                        {alert.time}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Badge className={alertLevelStyles[alert.level]}>
                        {alert.level}
                      </Badge>

                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        aria-label={`Deletar alerta ${alert.title}`}
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
