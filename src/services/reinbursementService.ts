import memberRepository from '@/repositories/memberRepository';
import reinbursementRepository from '@/repositories/reinbursementRepository';
import { ValidationError } from '@/errors/repositoryErrors';
import type {
  CreateReinbursementInput,
  Reinbursement,
  ReinbursementCategory,
  ReinbursementReceipt
} from '@/types/reinbursement/reinbursement';

const parseAmountToCents = (rawValue: string): number | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  const cents = Math.round(value * 100);
  return cents > 0 ? cents : null;
};

class ReinbursementService {
  async submitReinbursement(input: {
    memberId: string;
    title: string;
    description: string;
    category: ReinbursementCategory;
    amount: string;
    pixKey: string;
    receiptFile: File;
  }): Promise<void> {
    const memberId = input.memberId?.trim();
    if (!memberId) throw new ValidationError('Usuário inválido');

    const description = input.description?.trim();
    if (!description)
      throw new ValidationError('Descreva a solicitação de reembolso');

    const title = input.title?.trim();
    if (!title)
      throw new ValidationError('Informe um título para a solicitação');

    if (!input.category)
      throw new ValidationError('Selecione a categoria da solicitação');

    const amountCents = parseAmountToCents(input.amount);
    if (!amountCents)
      throw new ValidationError('Informe um valor válido para reembolso');

    const pixKey = input.pixKey?.trim();
    if (!pixKey) throw new ValidationError('Informe a chave PIX');

    const receipt = input.receiptFile;
    if (!receipt) throw new ValidationError('Anexe o comprovante');

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(receipt.type))
      throw new ValidationError('Comprovante deve ser PDF, JPEG ou PNG');

    const maxSizeBytes = 10 * 1024 * 1024;
    if (receipt.size > maxSizeBytes)
      throw new ValidationError('Comprovante deve ter no máximo 10 MB');

    const member = await memberRepository.getMemberById(memberId);
    if (!member) throw new ValidationError('Membro não encontrado no sistema');

    const receiptInfo: ReinbursementReceipt =
      await reinbursementRepository.uploadReceipt(memberId, receipt);

    const payload: CreateReinbursementInput = {
      memberId,
      memberName: member.name ?? '',
      memberEmail: member.email ?? '',
      title,
      description,
      category: input.category,
      amountCents,
      pixKey,
      receipt: receiptInfo,
      status: 'Pendente'
    };

    await reinbursementRepository.createReinbursement(payload);
  }

  async getMemberReinbursements(memberId: string): Promise<Reinbursement[]> {
    if (!memberId) throw new ValidationError('Usuário inválido');
    return await reinbursementRepository.getMemberReinbursements(memberId);
  }
}

export default new ReinbursementService();
