import candidateRepository from '@/repositories/candidateRepository';
import type {
  Candidate,
  CandidateForm,
  CandidateFormResponse
} from '@/types/candidate/candidate';

const fallbackImageUrls = [
  'https://api.slingacademy.com/public/sample-users/1.png',
  'https://api.slingacademy.com/public/sample-users/2.png',
  'https://api.slingacademy.com/public/sample-users/3.png',
  'https://api.slingacademy.com/public/sample-users/4.png',
  'https://api.slingacademy.com/public/sample-users/5.png',
  'https://api.slingacademy.com/public/sample-users/6.png',
  'https://api.slingacademy.com/public/sample-users/7.png',
  'https://api.slingacademy.com/public/sample-users/8.png'
];

const candidateFieldAliases = {
  nome: ['nome'],
  sobrenome: ['sobrenome'],
  curso: ['curso'],
  periodo: ['periodo'],
  etapa: ['etapa'],
  telefone: ['telefone', 'telefone para contato', 'celular', 'whatsapp'],
  email: ['email', 'e-mail', 'email para contato'],
  instagram: ['instagram', 'qual o seu instagram'],
  origemPsel: ['por onde voce ficou sabendo do psel', 'origem psel', 'origem'],
  oQueMove: ['o que te move', 'oque te move'],
  porqueWatt: [
    'por que voce gostaria de entrar na watt',
    'porque voce gostaria de entrar na watt',
    'por que watt',
    'porque watt'
  ],
  tamanhoCamisa: ['tamanho da camisa', 'tamanho camisa'],
  curriculumVitaeUrl: [
    'curriculum vitae',
    'curriculo',
    'curriculo vitae',
    'curriculum vitae url'
  ],
  historicoEscolarUrl: [
    'historico escolar',
    'historico',
    'historico escolar url'
  ],
  imagemUrl: ['imagem', 'foto', 'imagem url', 'foto do candidato']
} as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeFieldKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

const baseAliasKeys = new Set(
  Object.values(candidateFieldAliases)
    .flat()
    .map((alias) => normalizeFieldKey(alias))
);

function getFieldValue(
  values: Map<string, string>,
  aliases: readonly string[],
  fallback = 'Nao informado'
) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeFieldKey(alias);
    const value = values.get(normalizedAlias);
    if (value) {
      return value;
    }
  }

  return fallback;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function mapResponseToCandidate(
  response: CandidateFormResponse,
  index: number
): Candidate {
  const valuesByField = new Map<string, string>();

  for (const answer of response.respostas ?? []) {
    const fieldKey = normalizeFieldKey(answer.tituloPergunta ?? '');
    const value = (answer.valor ?? '').trim();
    if (!fieldKey || !value) continue;
    if (!valuesByField.has(fieldKey)) {
      valuesByField.set(fieldKey, value);
    }
  }

  const informacoesAdicionaisArray = (response.respostas ?? [])
    .filter((answer) => {
      const titulo = answer.tituloPergunta ?? '';
      const valor = (answer.valor ?? '').trim();
      if (!titulo || !valor) return false;
      return !baseAliasKeys.has(normalizeFieldKey(titulo));
    })
    .map((answer) => ({
      titulo: answer.tituloPergunta,
      valor: answer.valor.trim()
    }));

  const imagemInformada = getFieldValue(
    valuesByField,
    candidateFieldAliases.imagemUrl,
    ''
  );
  const imagemUrl = isHttpUrl(imagemInformada)
    ? imagemInformada
    : fallbackImageUrls[index % fallbackImageUrls.length];

  const curriculumInformado = getFieldValue(
    valuesByField,
    candidateFieldAliases.curriculumVitaeUrl,
    ''
  );
  const historicoInformado = getFieldValue(
    valuesByField,
    candidateFieldAliases.historicoEscolarUrl,
    ''
  );

  return {
    id: response.id,
    nome: getFieldValue(valuesByField, candidateFieldAliases.nome),
    sobrenome: getFieldValue(valuesByField, candidateFieldAliases.sobrenome),
    curso: getFieldValue(valuesByField, candidateFieldAliases.curso),
    periodo: getFieldValue(valuesByField, candidateFieldAliases.periodo),
    etapa: getFieldValue(
      valuesByField,
      candidateFieldAliases.etapa,
      'Inscricao'
    ),
    telefone: getFieldValue(valuesByField, candidateFieldAliases.telefone),
    email: getFieldValue(valuesByField, candidateFieldAliases.email),
    instagram: getFieldValue(valuesByField, candidateFieldAliases.instagram),
    origemPsel: getFieldValue(valuesByField, candidateFieldAliases.origemPsel),
    oQueMove: getFieldValue(valuesByField, candidateFieldAliases.oQueMove),
    porqueWatt: getFieldValue(valuesByField, candidateFieldAliases.porqueWatt),
    tamanhoCamisa: getFieldValue(
      valuesByField,
      candidateFieldAliases.tamanhoCamisa
    ),
    curriculumVitaeUrl: isHttpUrl(curriculumInformado)
      ? curriculumInformado
      : '#',
    historicoEscolarUrl: isHttpUrl(historicoInformado)
      ? historicoInformado
      : '#',
    imagemUrl,
    tarefas: [],
    informacoesAdicionais: informacoesAdicionaisArray,
    tags: response.tags ?? []
  };
}

class CandidateService {
  async getPselForms(): Promise<CandidateForm[]> {
    return await candidateRepository.listPselForms();
  }

  async getCandidatesByForm(formId: string): Promise<Candidate[]> {
    const responses = await candidateRepository.getFormResponses(formId);
    return responses.map(mapResponseToCandidate);
  }

  getFormPublicPath(form: CandidateForm | null): string {
    if (!form) return '';
    const pathName = form.slug || form.nomeFormulario;
    return `/forms/${encodeURIComponent(pathName)}`;
  }

  filterCandidates(candidates: Candidate[], query: string): Candidate[] {
    const normalizedQuery = normalizeText(query.trim());
    if (!normalizedQuery) return candidates;

    return candidates.filter((member) => {
      const fullName = `${member.nome} ${member.sobrenome}`;
      return [fullName, member.curso].some((field) =>
        normalizeText(field).includes(normalizedQuery)
      );
    });
  }

  async addTagToCandidate(
    formId: string,
    candidateId: string,
    tag: string
  ): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      throw new Error('Tag não pode ser vazia');
    }

    await candidateRepository.addTag(formId, candidateId, trimmedTag);
  }

  async removeTagFromCandidate(
    formId: string,
    candidateId: string,
    tag: string
  ): Promise<void> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      throw new Error('Tag não pode ser vazia');
    }

    await candidateRepository.removeTag(formId, candidateId, trimmedTag);
  }

  async addTagToMultipleCandidates(
    formId: string,
    candidateIds: string[],
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      return { success: false, error: 'Tag não pode ser vazia' };
    }

    if (!candidateIds || candidateIds.length === 0) {
      return {
        success: false,
        error: 'Selecione ao menos um candidato'
      };
    }

    try {
      await candidateRepository.addTagToMultipleCandidates(
        formId,
        candidateIds,
        trimmedTag
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Erro ao adicionar tag aos candidatos'
      };
    }
  }

  async removeTagFromMultipleCandidates(
    formId: string,
    candidateIds: string[],
    tag: string
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      return { success: false, error: 'Tag não pode ser vazia' };
    }

    if (!candidateIds || candidateIds.length === 0) {
      return {
        success: false,
        error: 'Selecione ao menos um candidato'
      };
    }

    try {
      await candidateRepository.removeTagFromMultipleCandidates(
        formId,
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
}

export default new CandidateService();
