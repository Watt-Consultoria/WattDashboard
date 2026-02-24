import formRepository from '@/repositories/formRepository';
import type {
  Form,
  FormQuestion,
  CreateFormInput,
  UpdateFormInput
} from '@/types/forms/form';
import { PSEL_REQUIRED_FIELD_TITLES } from '@/types/forms/form';

class FormService {
  /**
   * Obtém todos os formulários de um tipo específico
   */
  async getFormsByType(tipo: string): Promise<Form[]> {
    return await formRepository.listFormsByType(tipo);
  }

  /**
   * Obtém um formulário específico por ID
   */
  async getFormById(id: string): Promise<Form | null> {
    return await formRepository.getFormById(id);
  }

  /**
   * Cria um novo formulário
   */
  async createForm(input: CreateFormInput): Promise<Form> {
    return await formRepository.createForm(input);
  }

  /**
   * Atualiza um formulário existente
   */
  async updateForm(id: string, input: UpdateFormInput): Promise<void> {
    return await formRepository.updateForm(id, input);
  }

  /**
   * Deleta um formulário
   */
  async deleteForm(id: string): Promise<void> {
    return await formRepository.deleteForm(id);
  }

  async getAllForms(): Promise<Form[]> {
    return await formRepository.getAllForms();
  }

  /**
   * Valida um formulário de cadastroPsel antes de salvar
   * Garante que todas as perguntas obrigatórias estejam presentes
   */
  validatePselForm(form: CreateFormInput | UpdateFormInput): {
    valid: boolean;
    missingFields: string[];
  } {
    if (form.tipo !== 'cadastroPsel') {
      return { valid: true, missingFields: [] };
    }

    const perguntas = form.perguntas || [];
    const perguntaTitulos = perguntas.map((p) => p.titulo.toLowerCase().trim());

    const missingFields = PSEL_REQUIRED_FIELD_TITLES.filter((requiredTitle) => {
      const required = requiredTitle.toLowerCase().trim();
      return !perguntaTitulos.some(
        (titulo) => titulo.includes(required) || required.includes(titulo)
      );
    });

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Adiciona perguntas obrigatórias do PSEL a um formulário
   * Usa alias matching para detectar perguntas existentes e renomeá-las
   */
  ensurePselRequiredQuestions(perguntas: FormQuestion[]): FormQuestion[] {
    const perguntasAtualizadas = [...perguntas];

    // Mapa de variações esperadas para cada pergunta obrigatória
    const requiredQuestionsMap: Record<
      string,
      {
        titulo: string;
        variantes: string[];
      }
    > = {
      nome: {
        titulo: 'Nome',
        variantes: ['nome']
      },
      sobrenome: {
        titulo: 'Sobrenome',
        variantes: ['sobrenome']
      },
      curso: {
        titulo: 'Curso',
        variantes: ['curso']
      },
      periodo: {
        titulo: 'Periodo',
        variantes: ['periodo']
      },
      telefone: {
        titulo: 'Telefone para contato',
        variantes: [
          'telefone',
          'telefone para contato',
          'celular',
          'whatsapp',
          'telefone para contato'
        ]
      },
      email: {
        titulo: 'E-mail para contato',
        variantes: ['email', 'e-mail', 'email para contato']
      },
      instagram: {
        titulo: 'Qual o seu instagram',
        variantes: ['instagram', 'qual o seu instagram']
      },
      origemPsel: {
        titulo: 'Por onde voce ficou sabendo do PSEL?',
        variantes: ['por onde voce ficou sabendo', 'origem psel', 'origem']
      },
      oQueMove: {
        titulo: 'O que te move',
        variantes: ['o que te move', 'oque te move']
      },
      porqueWatt: {
        titulo: 'Por que voce gostaria de entrar na WATT?',
        variantes: [
          'por que voce gostaria de entrar',
          'porque voce gostaria',
          'por que watt'
        ]
      },
      tamanhoCamisa: {
        titulo: 'Tamanho da camisa',
        variantes: ['tamanho da camisa', 'tamanho camisa']
      },
      curriculum: {
        titulo: 'Curriculum Vitae',
        variantes: ['curriculum', 'curriculo', 'cv']
      },
      historico: {
        titulo: 'Historico escolar',
        variantes: ['historico', 'historico escolar']
      },
      imagem: {
        titulo: 'Imagem',
        variantes: ['imagem', 'foto', 'foto do candidato']
      }
    };

    return perguntasAtualizadas;
  }

  /**
   * Valida se todas as respostas obrigatórias foram preenchidas
   */
  validateFormSubmission(
    form: Form,
    respostas: Record<string, string | string[]>
  ): {
    valid: boolean;
    missingFields: string[];
  } {
    const perguntasObrigatorias = form.perguntas.filter((p) => p.obrigatoria);
    const missingFields: string[] = [];

    for (const pergunta of perguntasObrigatorias) {
      const resposta = respostas[pergunta.id];

      if (!resposta) {
        missingFields.push(pergunta.titulo);
        continue;
      }

      // Para arrays (checkbox, multipleChoice), verificar se está vazio
      if (Array.isArray(resposta) && resposta.length === 0) {
        missingFields.push(pergunta.titulo);
        continue;
      }

      // Para strings, verificar se está vazio ou whitespace apenas
      if (typeof resposta === 'string' && !resposta.trim()) {
        missingFields.push(pergunta.titulo);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }
}

export default new FormService();
