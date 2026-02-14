import type {
  CreateReinbursementInput,
  Reinbursement,
  ReinbursementReceipt
} from './reinbursement';

export default interface IReinbursementRepository {
  createReinbursement(reinbursement: CreateReinbursementInput): Promise<void>;
  uploadReceipt(memberId: string, file: File): Promise<ReinbursementReceipt>;
  getMemberReinbursements(memberId: string): Promise<Reinbursement[]>;
}
