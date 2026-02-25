import formRepository from '@/repositories/formRepository';
import type { Form, FormQuestion, SubmitFormInput } from '@/types/forms/form';
import { Timestamp } from 'firebase/firestore';

/**
 * Service para gerenciar formulários públicos
 * Responsável por buscar, validar e processar formulários para exibição ao público
 */
class PublicFormService {
  /**
   * Busca um formulário por slug
   */
  async getFormBySlug(slug: string): Promise<Form | null> {
    const form = await formRepository.getFormBySlug(slug);

    if (!form) return null;

    // Garantir que o formulário está ativo
    if (!form.ativa) return null;

    return form;
  }

  /**
   * Formata slug para exibição a partir de um nome
   */
  formatSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Decodifica um slug ou nome do URL
   */
  decodePathName(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  /**
   * Retorna o rótulo de um tipo de pergunta
   */
  getQuestionTypeLabel(tipo: string): string {
    const labels: Record<string, string> = {
      shortText: 'Resposta curta',
      paragraph: 'Parágrafo',
      rating: 'Classificação',
      multipleChoice: 'Múltipla escolha',
      checkbox: 'Caixas de seleção',
      select: 'Lista suspensa',
      fileUpload: 'Upload de arquivo',
      infoSection: 'Seção informativa'
    };

    return labels[tipo] || 'Resposta';
  }

  /**
   * Verifica se o tipo de pergunta requer upload de arquivo
   */
  isFileQuestion(tipo: string): boolean {
    return tipo === 'fileUpload';
  }

  /**
   * Verifica se o tipo de pergunta requer múltiplas opções
   */
  hasOptions(tipo: string): boolean {
    return ['multipleChoice', 'checkbox', 'select', 'rating'].includes(tipo);
  }

  /**
   * Verifica se a resposta está vazia
   */
  isAnswerEmpty(tipo: string, value: unknown): boolean {
    if (tipo === 'fileUpload') {
      return !(value instanceof File);
    }

    if (typeof value === 'string') {
      return !value.trim();
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return !value;
  }

  /**
   * Valida se o formulário pode ser enviado
   */
  validateFormSubmission(
    form: Form,
    answers: Record<string, unknown>
  ): {
    valid: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];

    for (const pergunta of form.perguntas) {
      // Seções informativas não são validadas
      if (pergunta.tipo === 'infoSection') continue;

      const value = answers[pergunta.id];
      const isEmpty = this.isAnswerEmpty(pergunta.tipo, value);

      if (pergunta.obrigatoria && isEmpty) {
        missingFields.push(pergunta.titulo);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Prepara as respostas para submissão
   * Retorna array com informações completas para salvar no Firestore
   */
  prepareAnswersForSubmission(
    form: Form,
    answers: Record<string, unknown>
  ): Array<{
    perguntaId: string;
    perguntaTitulo: string;
    tipo: string;
    valor: string | string[] | null;
  }> {
    return form.perguntas
      .filter((pergunta) => pergunta.tipo !== 'infoSection')
      .map((pergunta) => {
        const value = answers[pergunta.id];

        if (value instanceof File) {
          // Será processado no upload
          return {
            perguntaId: pergunta.id,
            perguntaTitulo: pergunta.titulo,
            tipo: pergunta.tipo,
            valor: null // Placeholder, será substituído pela URL de download
          };
        }

        if (Array.isArray(value)) {
          return {
            perguntaId: pergunta.id,
            perguntaTitulo: pergunta.titulo,
            tipo: pergunta.tipo,
            valor: value
          };
        }

        return {
          perguntaId: pergunta.id,
          perguntaTitulo: pergunta.titulo,
          tipo: pergunta.tipo,
          valor: value ? String(value) : null
        };
      });
  }

  /**
   * Calcula o progresso de preenchimento do formulário
   */
  calculateProgress(
    form: Form,
    answers: Record<string, unknown>
  ): {
    answered: number;
    total: number;
    percent: number;
  } {
    const answerableQuestions = form.perguntas.filter(
      (p) => p.tipo !== 'infoSection'
    );
    const total = answerableQuestions.length;
    const answered = answerableQuestions.filter(
      (p) => !this.isAnswerEmpty(p.tipo, answers[p.id])
    ).length;
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, total, percent };
  }

  /**
   * Agrupar perguntas por tipo (para exibição em etapas ou seções)
   */
  groupQuestionsByType(perguntas: FormQuestion[]): Map<string, FormQuestion[]> {
    const grouped = new Map<string, FormQuestion[]>();

    for (const pergunta of perguntas) {
      if (!grouped.has(pergunta.tipo)) {
        grouped.set(pergunta.tipo, []);
      }
      grouped.get(pergunta.tipo)!.push(pergunta);
    }

    return grouped;
  }
}

export default new PublicFormService();
