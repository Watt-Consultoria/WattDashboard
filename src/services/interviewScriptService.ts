import interviewScriptRepository from '@/repositories/interviewScriptRepository';
import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import type {
  InterviewQuestion,
  InterviewQuestionSection,
  InterviewSliderState,
  InterviewAnswersMap,
  InterviewQuestionAnswer,
  SaveInterviewAnswersInput
} from '@/types/interview/interview-script';
import { ValidationError } from '@/errors/serviceErrors';

/**
 * Serviço responsável pelo roteiro de entrevistas.
 *
 * Centraliza toda a lógica de negócio relacionada à montagem, ordenação
 * e organização das perguntas para exibição no slider de entrevista,
 * bem como a captura e persistência de respostas do roteiro.
 * Não deve ser confundido com `InterviewService`, que lida com agendamento
 * e avaliação de entrevistas.
 */
class InterviewScriptService {
  /**
   * Retorna todas as perguntas do roteiro ordenadas pelo campo `order`.
   */
  getOrderedQuestions(): InterviewQuestion[] {
    const questions = interviewScriptRepository.getAllQuestions();
    return [...questions].sort((a, b) => a.order - b.order);
  }

  /**
   * Retorna as perguntas de uma seção específica, ordenadas.
   */
  getQuestionsBySection(
    section: InterviewQuestionSection
  ): InterviewQuestion[] {
    return this.getOrderedQuestions().filter((q) => q.section === section);
  }

  /**
   * Retorna a lista de seções presentes no roteiro, na ordem em que aparecem.
   * A ordem é determinada pela primeira pergunta de cada seção.
   */
  getOrderedSections(): InterviewQuestionSection[] {
    const seen = new Set<InterviewQuestionSection>();
    const sections: InterviewQuestionSection[] = [];
    for (const q of this.getOrderedQuestions()) {
      if (!seen.has(q.section)) {
        seen.add(q.section);
        sections.push(q.section);
      }
    }
    return sections;
  }

  /**
   * Retorna o total de perguntas do roteiro.
   */
  getTotalQuestions(): number {
    return this.getOrderedQuestions().length;
  }

  /**
   * Constrói o estado inicial do slider de perguntas.
   * Retorna `null` se o roteiro estiver vazio.
   */
  buildInitialSliderState(): InterviewSliderState | null {
    const questions = this.getOrderedQuestions();
    if (questions.length === 0) return null;

    return {
      currentIndex: 0,
      totalQuestions: questions.length,
      currentQuestion: questions[0]
    };
  }

  /**
   * Navega para a próxima pergunta.
   * Retorna o novo estado ou `null` se já estiver na última.
   */
  navigateNext(
    currentState: InterviewSliderState
  ): InterviewSliderState | null {
    const questions = this.getOrderedQuestions();
    const nextIndex = currentState.currentIndex + 1;
    if (nextIndex >= questions.length) return null;

    return {
      currentIndex: nextIndex,
      totalQuestions: questions.length,
      currentQuestion: questions[nextIndex]
    };
  }

  /**
   * Navega para a pergunta anterior.
   * Retorna o novo estado ou `null` se já estiver na primeira.
   */
  navigatePrevious(
    currentState: InterviewSliderState
  ): InterviewSliderState | null {
    const questions = this.getOrderedQuestions();
    const prevIndex = currentState.currentIndex - 1;
    if (prevIndex < 0) return null;

    return {
      currentIndex: prevIndex,
      totalQuestions: questions.length,
      currentQuestion: questions[prevIndex]
    };
  }

  /**
   * Navega diretamente para uma pergunta pelo índice.
   * Retorna `null` se o índice for inválido.
   */
  navigateToIndex(index: number): InterviewSliderState | null {
    const questions = this.getOrderedQuestions();
    if (index < 0 || index >= questions.length) return null;

    return {
      currentIndex: index,
      totalQuestions: questions.length,
      currentQuestion: questions[index]
    };
  }

  /**
   * Retorna o número da pergunta atual para exibição (1-based).
   */
  getCurrentQuestionNumber(currentIndex: number): number {
    return currentIndex + 1;
  }

  /**
   * Retorna a porcentagem de progresso da entrevista (0–100).
   */
  getProgressPercent(currentIndex: number, total: number): number {
    if (total === 0) return 0;
    return Math.round(((currentIndex + 1) / total) * 100);
  }

  // ── Respostas do roteiro ────────────────────────────────────────────────

  /**
   * Monta o mapa de respostas a partir de um registro parcial (texto por questionId).
   * Valida que cada questionId pertence ao roteiro e gera a estrutura completa.
   */
  buildAnswersMap(rawAnswers: Record<string, string>): InterviewAnswersMap {
    const questions = this.getOrderedQuestions();
    const questionIndex = new Map(questions.map((q) => [q.id, q]));
    const answersMap: InterviewAnswersMap = {};
    const now = new Date().toISOString();

    for (const [questionId, answerText] of Object.entries(rawAnswers)) {
      const question = questionIndex.get(questionId);
      if (!question) {
        // Ignora respostas para perguntas que não existem no roteiro
        continue;
      }

      const trimmed = answerText.trim();
      if (!trimmed) continue;

      answersMap[questionId] = {
        questionId,
        section: question.section,
        order: question.order,
        answer: trimmed,
        updatedAt: now
      };
    }

    return answersMap;
  }

  /**
   * Faz merge incremental entre respostas existentes e novas.
   * Novas respostas sobrescrevem as existentes para o mesmo questionId.
   */
  mergeAnswers(
    existing: InterviewAnswersMap | undefined,
    incoming: InterviewAnswersMap
  ): InterviewAnswersMap {
    return {
      ...(existing ?? {}),
      ...incoming
    };
  }

  /**
   * Salva (ou atualiza) as respostas do roteiro de entrevista no documento
   * do candidato, dentro de `interview.answers`.
   *
   * - Valida o candidateId
   * - Constrói o answersMap a partir das respostas brutas
   * - Faz merge com respostas previamente salvas
   * - Persiste via repository
   */
  async saveInterviewAnswers(input: SaveInterviewAnswersInput): Promise<void> {
    if (!input.candidateId?.trim()) {
      throw new ValidationError('ID do candidato é obrigatório');
    }

    const candidate = await savedCandidateRepository.getCandidateById(
      input.candidateId
    );
    if (!candidate) {
      throw new ValidationError('Candidato não encontrado');
    }

    // Merge com respostas existentes
    const existingAnswers = candidate.interview?.answers;
    const mergedAnswers = this.mergeAnswers(existingAnswers, input.answers);

    await savedCandidateRepository.setInterviewAnswers(
      input.candidateId,
      mergedAnswers
    );
  }

  /**
   * Busca as respostas já salvas para um candidato.
   * Retorna mapa vazio caso não existam respostas.
   */
  async getInterviewAnswers(candidateId: string): Promise<InterviewAnswersMap> {
    if (!candidateId?.trim()) return {};

    const candidate =
      await savedCandidateRepository.getCandidateById(candidateId);
    return candidate?.interview?.answers ?? {};
  }

  /**
   * Retorna a quantidade de perguntas respondidas a partir de um answersMap.
   */
  countAnswered(answers: InterviewAnswersMap | undefined): number {
    if (!answers) return 0;
    return Object.values(answers).filter((a) => a.answer.trim().length > 0)
      .length;
  }
}

const interviewScriptService = new InterviewScriptService();
export default interviewScriptService;
