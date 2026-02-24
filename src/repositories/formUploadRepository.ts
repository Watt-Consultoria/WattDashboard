import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '@/lib/firebase/client';
import { FirebaseError } from '@/errors/repositoryErrors';

export type UploadedFile = {
  downloadUrl: string;
  storagePath: string;
  originalFileName: string;
  contentType: string;
  sizeInBytes: number;
};

function toFormSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .trim();
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot);
}

/**
 * Repository para gerenciar uploads de arquivos de formulários
 * Padrão: externForms/{formId}/respostas/{timestamp-randomId}/{fileName}
 */
class FormUploadRepository {
  /**
   * Faz upload de um arquivo para um formulário
   * @param formId ID do formulário
   * @param responseId ID da resposta (único para esta resposta)
   * @param questionTitle Título da pergunta (utilizado para nomear o arquivo)
   * @param file Arquivo para fazer upload
   * @returns Objeto com URL de download e informações do arquivo
   */
  async uploadFile(
    formId: string,
    responseId: string,
    questionTitle: string,
    file: File
  ): Promise<UploadedFile> {
    if (!firebaseStorage) {
      throw new FirebaseError('Firebase Storage não está configurado');
    }

    if (!formId || !responseId || !questionTitle || !file) {
      throw new FirebaseError('Parâmetros obrigatórios faltando');
    }

    try {
      // Construir caminho no storage
      const timestamp = Date.now();
      const randomId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      const questionSlug = toFormSlug(questionTitle) || 'arquivo';
      const extension = getFileExtension(file.name);

      const storagePath = [
        'externForms',
        formId,
        'respostas',
        responseId,
        `${questionSlug}${extension}`
      ].join('/');

      // Fazer upload
      const storageRef = ref(firebaseStorage, storagePath);
      await uploadBytes(storageRef, file, {
        contentType: file.type || undefined
      });

      // Obter URL de download
      const downloadUrl = await getDownloadURL(storageRef);

      return {
        downloadUrl,
        storagePath,
        originalFileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeInBytes: file.size
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw new FirebaseError(`Erro ao fazer upload: ${message}`);
    }
  }

  /**
   * Faz upload de múltiplos arquivos em lote
   * @param formId ID do formulário
   * @param responseId ID da resposta
   * @param files Array de {questionTitle, file}
   * @returns Array com resultados do upload
   */
  async uploadFiles(
    formId: string,
    responseId: string,
    files: Array<{ questionTitle: string; file: File }>
  ): Promise<UploadedFile[]> {
    if (!files || files.length === 0) {
      return [];
    }

    try {
      const uploadPromises = files.map((item) =>
        this.uploadFile(formId, responseId, item.questionTitle, item.file)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw error;
      }
      throw new FirebaseError(
        error instanceof Error
          ? `Erro ao fazer upload de arquivos: ${error.message}`
          : 'Erro desconhecido ao fazer upload de arquivos'
      );
    }
  }
}

const formUploadRepository = new FormUploadRepository();
export default formUploadRepository;
