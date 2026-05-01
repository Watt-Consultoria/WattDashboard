import type {
  CreateReinbursementInput,
  Reinbursement,
  ReinbursementStatus,
  ReinbursementReceipt,
  ReinbursementQuery
} from './reinbursement';

export default interface IReinbursementRepository {
  createReinbursement(reinbursement: CreateReinbursementInput): Promise<void>;
  uploadReceipts(
    memberId: string,
    files: File[]
  ): Promise<ReinbursementReceipt[]>;
  getMemberReinbursements(memberId: string): Promise<Reinbursement[]>;
  getReinbursements(filters?: ReinbursementQuery): Promise<Reinbursement[]>;
  updateReinbursementStatus(
    id: string,
    status: ReinbursementStatus
  ): Promise<void>;
  excludeReinbursementFromManagement(id: string): Promise<void>;
}
