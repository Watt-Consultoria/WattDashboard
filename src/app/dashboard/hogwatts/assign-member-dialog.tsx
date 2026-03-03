'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import hogwattsService from '@/services/hogwattsService';
import memberService from '@/services/memberService';
import type { Member } from '@/types/member/member';
import type {
  HogwattsHouseName,
  HogwattsMemberProfile,
  HOGWATTS_HOUSES
} from '@/types/hogwatts/hogwatts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProfiles: HogwattsMemberProfile[];
  onSuccess: () => void;
}

const HOUSES: HogwattsHouseName[] = ['Nexus', 'Lumina', 'Voltus'];

export function AssignMemberDialog({
  open,
  onOpenChange,
  existingProfiles,
  onSuccess
}: AssignMemberDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Carrega a lista de membros do sistema quando o dialog abre
  useEffect(() => {
    if (!open) return;

    const loadMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const allMembers = await memberService.getAllMembers();
        setMembers(allMembers);
      } catch {
        toast.error('Erro ao carregar membros');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMembers();
  }, [open]);

  const assignedMemberIds = new Set(existingProfiles.map((p) => p.memberId));
  const unassignedMembers = members.filter((m) => !assignedMemberIds.has(m.id));

  const handleAssign = async () => {
    if (!selectedMemberId) {
      toast.error('Selecione um membro');
      return;
    }
    if (!selectedHouse) {
      toast.error('Selecione uma casa');
      return;
    }

    setIsSubmitting(true);
    try {
      await hogwattsService.assignMemberToHouse({
        memberId: selectedMemberId,
        houseName: selectedHouse as HogwattsHouseName
      });
      toast.success('Membro atribuído à casa com sucesso!');
      setSelectedMemberId('');
      setSelectedHouse('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao atribuir membro à casa.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <UserPlus className='h-5 w-5' />
            Atribuir Membro a Casa
          </DialogTitle>
          <DialogDescription>
            Selecione um membro e a casa à qual ele será vinculado no Hogwatts.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='member'>Membro</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger id='member'>
                <SelectValue
                  placeholder={
                    isLoadingMembers
                      ? 'Carregando membros...'
                      : 'Selecione um membro'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {unassignedMembers.length === 0 ? (
                  <SelectItem value='__empty' disabled>
                    Todos os membros já estão atribuídos
                  </SelectItem>
                ) : (
                  unassignedMembers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='house'>Casa</Label>
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger id='house'>
                <SelectValue placeholder='Selecione uma casa' />
              </SelectTrigger>
              <SelectContent>
                {HOUSES.map((house) => (
                  <SelectItem key={house} value={house}>
                    {house}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedMemberId || !selectedHouse}
          >
            {isSubmitting ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
