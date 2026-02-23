import type {
  CreateReinbursementInput,
  Reinbursement,
  ReinbursementStatus,
  ReinbursementReceipt,
  ReinbursementQuery
} from './reinbursement';

export default interface IReinbursementRepository {
  createReinbursement(reinbursement: CreateReinbursementInput): Promise<void>;
  uploadReceipt(memberId: string, file: File): Promise<ReinbursementReceipt>;
  getMemberReinbursements(memberId: string): Promise<Reinbursement[]>;
  getReinbursements(filters?: ReinbursementQuery): Promise<Reinbursement[]>;
  updateReinbursementStatus(
    id: string,
    status: ReinbursementStatus
  ): Promise<void>;
}
