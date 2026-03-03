import savedCandidateRepository from '@/repositories/savedCandidateRepository';
import type {
  Candidate,
  CandidateInterview
} from '@/types/candidate/candidate';
import type {
  SavedCandidate,
  SaveCandidateInput
} from '@/types/candidate/saved-candidate';

class SavedCandidateService {
  /**
   * Converte um pré-candidato (Candidate vindo das respostas do formulário)
   * em um candidato salvo na coleção `candidates`.
   */
  async savePreCandidateAsCandidate(
    preCandidate: Candidate,
    formId: string
  ): Promise<SavedCandidate> {
    if (!formId) {
      throw new Error('ID do formulário é obrigatório');
    }
    if (!preCandidate.id) {
      throw new Error('ID do pré-candidato é obrigatório');
    }

    // Verificar se já foi salvo
    const alreadyExists = await savedCandidateRepository.existsByRespostaId(
      preCandidate.id
    );
    if (alreadyExists) {
      throw new Error('Este pré-candidato já foi salvo como candidato');
    }

    const input: SaveCandidateInput = {
      nome: preCandidate.nome,
      sobrenome: preCandidate.sobrenome,
      curso: preCandidate.curso,
      periodo: preCandidate.periodo,
      etapa: preCandidate.etapa,
      telefone: preCandidate.telefone,
      email: preCandidate.email,
      instagram: preCandidate.instagram,
      origemPsel: preCandidate.origemPsel,
      oQueMove: preCandidate.oQueMove,
      porqueWatt: preCandidate.porqueWatt,
      tamanhoCamisa: preCandidate.tamanhoCamisa,
      curriculumVitaeUrl: preCandidate.curriculumVitaeUrl,
      historicoEscolarUrl: preCandidate.historicoEscolarUrl,
      imagemUrl: preCandidate.imagemUrl,
      tarefas: preCandidate.tarefas ?? [],
      informacoesAdicionais: preCandidate.informacoesAdicionais ?? [],
      tags: preCandidate.tags ?? [],
      formIdOrigem: formId,
      respostaIdOrigem: preCandidate.id
    };

    return await savedCandidateRepository.saveCandidate(input);
  }

  /**
   * Lista todos os candidatos salvos na coleção `candidates`.
   */
  async listSavedCandidates(): Promise<SavedCandidate[]> {
    return await savedCandidateRepository.listCandidates();
  }

  /**
   * Converte SavedCandidate para o tipo Candidate (para reutilizar código da UI).
   */
  savedCandidateToCandidate(saved: SavedCandidate): Candidate {
    return {
      id: saved.id,
      nome: saved.nome,
      sobrenome: saved.sobrenome,
      curso: saved.curso,
      periodo: saved.periodo,
      etapa: saved.etapa,
      telefone: saved.telefone,
      email: saved.email,
      instagram: saved.instagram,
      origemPsel: saved.origemPsel,
      oQueMove: saved.oQueMove,
      porqueWatt: saved.porqueWatt,
      tamanhoCamisa: saved.tamanhoCamisa,
      curriculumVitaeUrl: saved.curriculumVitaeUrl,
      historicoEscolarUrl: saved.historicoEscolarUrl,
      imagemUrl: saved.imagemUrl,
      tarefas: saved.tarefas ?? [],
      informacoesAdicionais: saved.informacoesAdicionais ?? [],
      tags: saved.tags ?? [],
      desclassificado: saved.desclassificado ?? false,
      interview: saved.interview ?? { state: 'notSentEmail' }
    };
  }

  /**
   * Lista candidatos salvos convertidos para o tipo Candidate.
   */
  async listSavedCandidatesAsCandidate(): Promise<Candidate[]> {
    const savedCandidates = await savedCandidateRepository.listCandidates();
    return savedCandidates.map((sc) => this.savedCandidateToCandidate(sc));
  }

  /**
   * Lista apenas os candidatos salvos ativos (não desclassificados).
   */
  async listActiveSavedCandidatesAsCandidate(): Promise<Candidate[]> {
    const all = await this.listSavedCandidatesAsCandidate();
    return all.filter((c) => !c.desclassificado);
  }

  /**
   * Lista apenas os candidatos salvos desclassificados.
   */
  async listDisqualifiedSavedCandidatesAsCandidate(): Promise<Candidate[]> {
    const all = await this.listSavedCandidatesAsCandidate();
    return all.filter((c) => c.desclassificado);
  }

  /**
   * Filtra candidatos salvos por nome ou curso.
   */
  filterCandidates(candidates: Candidate[], queryText: string): Candidate[] {
    const normalized = queryText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (!normalized) return candidates;

    return candidates.filter((c) => {
      const fullName = `${c.nome} ${c.sobrenome}`;
      return [fullName, c.curso].some((field) =>
        field
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normalized)
      );
    });
  }

  /**
   * Verifica se um pré-candidato já foi salvo como candidato.
   */
  async isAlreadySaved(preCandidateId: string): Promise<boolean> {
    return await savedCandidateRepository.existsByRespostaId(preCandidateId);
  }

  // ---- Tag operations para candidatos salvos ----

  async addTagToCandidate(candidateId: string, tag: string): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new Error('Tag não pode ser vazia');
    await savedCandidateRepository.addTag(candidateId, trimmedTag);
  }

  async removeTagFromCandidate(
    candidateId: string,
    tag: string
  ): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) throw new Error('Tag não pode ser vazia');
    await savedCandidateRepository.removeTag(candidateId, trimmedTag);
  }

  async addTagToMultipleCandidates(
    candidateIds: string[],
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return { success: false, error: 'Tag não pode ser vazia' };
    if (!candidateIds || candidateIds.length === 0) {
      return { success: false, error: 'Selecione ao menos um candidato' };
    }

    try {
      await savedCandidateRepository.addTagToMultiple(candidateIds, trimmedTag);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Erro ao adicionar tag aos candidatos'
      };
    }
  }

  async removeTagFromMultipleCandidates(
    candidateIds: string[],
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return { success: false, error: 'Tag não pode ser vazia' };
    if (!candidateIds || candidateIds.length === 0) {
      return { success: false, error: 'Selecione ao menos um candidato' };
    }

    try {
      await savedCandidateRepository.removeTagFromMultiple(
        candidateIds,
        trimmedTag
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Erro ao remover tag dos candidatos'
      };
    }
  }

  async disqualifyCandidate(candidateId: string): Promise<void> {
    if (!candidateId) throw new Error('ID do candidato é obrigatório');
    await savedCandidateRepository.disqualifyCandidate(candidateId);
  }

  /**
   * Atualiza o estado de entrevista de um candidato.
   */
  async updateInterviewState(
    candidateId: string,
    interview: CandidateInterview
  ): Promise<void> {
    if (!candidateId) throw new Error('ID do candidato é obrigatório');
    await savedCandidateRepository.updateInterviewState(candidateId, interview);
  }

  /**
   * Atualiza o estado de entrevista de múltiplos candidatos.
   */
  async updateInterviewStateForMultiple(
    candidateIds: string[],
    interview: CandidateInterview
  ): Promise<void> {
    if (!candidateIds || candidateIds.length === 0) {
      throw new Error('IDs dos candidatos são obrigatórios');
    }
    await savedCandidateRepository.updateInterviewStateForMultiple(
      candidateIds,
      interview
    );
  }
}

export default new SavedCandidateService();
