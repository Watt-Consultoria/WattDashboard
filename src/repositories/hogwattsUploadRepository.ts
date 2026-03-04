import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '@/lib/firebase/client';
import { FirebaseError } from '@/errors/repositoryErrors';

export type HogwattsUploadedFile = {
  downloadUrl: string;
  storagePath: string;
  originalFileName: string;
  contentType: string;
  sizeInBytes: number;
};

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot);
}

/**
 * Repository para gerenciar uploads de arquivos de comprovação de tarefas do Hogwatts
 * Padrão: hogwattsSubmissions/{fileId}
 */
class HogwattsUploadRepository {
  /**
   * Faz upload de um arquivo de comprovação de tarefa do Hogwatts
   * @param fileId ID único do arquivo (gerado com data + timestamp)
   * @param file Arquivo para fazer upload
   * @returns Objeto com URL de download e informações do arquivo
   */
  async uploadProofFile(
    fileId: string,
    file: File
  ): Promise<HogwattsUploadedFile> {
    if (!firebaseStorage) {
      throw new FirebaseError('Firebase Storage não está configurado');
    }

    if (!fileId || !file) {
      throw new FirebaseError('Parâmetros obrigatórios faltando');
    }

    try {
      const extension = getFileExtension(file.name);
      const storagePath = `hogwattsSubmissions/${fileId}${extension}`;

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
      throw new FirebaseError(
        `Erro ao fazer upload do arquivo de comprovação: ${message}`
      );
    }
  }
}

const hogwattsUploadRepository = new HogwattsUploadRepository();
export default hogwattsUploadRepository;
