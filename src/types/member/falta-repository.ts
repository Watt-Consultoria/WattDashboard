import { CreateFaltaRequest, Falta } from './falta';

export default interface FaltaRepository {
  getFaltasByMemberId(memberId: string): Promise<Falta[]>;

  getFaltaById(memberId: string, faltaId: string): Promise<Falta | null>;

  createFalta(
    memberId: string,
    falta: CreateFaltaRequest,
    addedBy: string
  ): Promise<Falta>;

  updateFalta(
    memberId: string,
    faltaId: string,
    updates: Partial<Omit<Falta, 'id' | 'memberId' | 'createdAt'>>
  ): Promise<void>;

  getActiveFaltasByMemberId(memberId: string): Promise<Falta[]>;

  getAllFaltas(): Promise<Falta[]>;
}
