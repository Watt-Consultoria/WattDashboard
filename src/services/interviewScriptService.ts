import interviewScriptRepository from '@/repositories/interviewScriptRepository';
import type {
  InterviewQuestion,
  InterviewQuestionSection,
  InterviewSliderState
} from '@/types/interview/interview-script';

/**
 * Serviço responsável pelo roteiro de entrevistas.
 *
 * Centraliza toda a lógica de negócio relacionada à montagem, ordenação
 * e organização das perguntas para exibição no slider de entrevista.
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
}

const interviewScriptService = new InterviewScriptService();
export default interviewScriptService;
