import formUploadRepository from '@/repositories/formUploadRepository';
import type { Form, FormQuestion } from '@/types/forms/form';
import type { UploadedFile } from '@/repositories/formUploadRepository';

/**
 * Service para gerenciar uploads de arquivos de formulários
 * Responsável por coordenar uploads e preparar dados para submissão
 */
class FormUploadService {
  /**
   * Identifica perguntas que requerem upload na resposta
   */
  getUploadQuestions(form: Form): FormQuestion[] {
    return form.perguntas.filter((q) => q.tipo === 'fileUpload');
  }

  /**
   * Verifica se há arquivos para upload nas respostas
   */
  hasFileUploads(form: Form, answers: Record<string, unknown>): boolean {
    return this.getUploadQuestions(form).some((q) => {
      const value = answers[q.id];
      return value instanceof File;
    });
  }

  /**
   * Processa uploads de múltiplos arquivos em paralelo
   * @param formId ID do formulário
   * @param responseId ID único da resposta
   * @param form Objeto do formulário com estrutura das perguntas
   * @param answers Mapa de respostas {perguntaId: File | string | null}
   * @returns Mapa {perguntaId: downloadUrl}
   */
  async uploadFiles(
    formId: string,
    responseId: string,
    form: Form,
    answers: Record<string, unknown>
  ): Promise<Record<string, string>> {
    const uploadMap: Record<string, string> = {};
    const filesToUpload: Array<{
      perguntaId: string;
      perguntaTitulo: string;
      file: File;
    }> = [];

    // Coletar arquivos para upload
    for (const pergunta of this.getUploadQuestions(form)) {
      const value = answers[pergunta.id];
      if (value instanceof File) {
        filesToUpload.push({
          perguntaId: pergunta.id,
          perguntaTitulo: pergunta.titulo,
          file: value
        });
      }
    }

    // Se não há arquivos, retornar vazio
    if (filesToUpload.length === 0) {
      return uploadMap;
    }

    // Fazer upload de todos em paralelo
    try {
      const uploadedFiles = await formUploadRepository.uploadFiles(
        formId,
        responseId,
        filesToUpload.map((item) => ({
          questionTitle: item.perguntaTitulo,
          file: item.file
        }))
      );

      // Mapear URLs de volta para perguntaId
      for (let i = 0; i < filesToUpload.length; i++) {
        uploadMap[filesToUpload[i].perguntaId] = uploadedFiles[i].downloadUrl;
      }

      return uploadMap;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Erro desconhecido ao fazer upload de arquivos');
    }
  }

  /**
   * Prepara respostas para submissão substituindo Files por URLs
   * @param answers Mapa original de respostas
   * @param uploadedFileMap Mapa de {perguntaId: downloadUrl}
   * @returns Respostas prontas para Firestore
   */
  prepareAnswersWithUploadedFiles(
    answers: Record<string, unknown>,
    uploadedFileMap: Record<string, string>
  ): Record<string, unknown> {
    const prepared: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(answers)) {
      if (uploadedFileMap[key]) {
        // Se tem URL de upload, usar ela
        prepared[key] = uploadedFileMap[key];
      } else if (!(value instanceof File)) {
        // Se não é arquivo, manter valor original
        prepared[key] = value;
      }
      // Se é arquivo mas não tem upload, ignorar (erro anterior deveria ter capturado)
    }

    return prepared;
  }
}

const formUploadService = new FormUploadService();
export default formUploadService;
