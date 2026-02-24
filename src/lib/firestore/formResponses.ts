import {
  collection,
  addDoc,
  serverTimestamp,
  getFirestore,
  Timestamp
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';

export type FormAnswer = {
  perguntaId: string;
  perguntaTitulo: string;
  tipo: string;
  valor: string | string[] | null;
};

export type FormSubmissionData = {
  respostas: FormAnswer[];
};

export type FormSubmissionResponse = {
  id: string;
  criadoEm: Timestamp;
};

/**
 * Submete as respostas de um formulário para o Firestore
 * Salva na subcoleção: formularios/{formId}/respostas
 * @param formId ID do formulário
 * @param data Objeto contendo array de respostas
 * @returns Objeto com ID da resposta salva e timestamp
 */
export async function submitFormResponse(
  formId: string,
  data: FormSubmissionData
): Promise<FormSubmissionResponse> {
  try {
    if (!firebaseDb) {
      throw new Error('Firebase não está configurado');
    }

    const responsesCollectionRef = collection(
      firebaseDb,
      'externForms',
      formId,
      'respostas'
    );

    const docRef = await addDoc(responsesCollectionRef, {
      ...data,
      criadoEm: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      criadoEm: serverTimestamp() as Timestamp
    };
  } catch (error) {
    console.error('Erro ao salvar resposta do formulário:', error);
    throw new Error(
      error instanceof Error
        ? `Falha ao enviar formulário: ${error.message}`
        : 'Falha ao enviar formulário.'
    );
  }
}

/**
 * Submete respostas de um formulário com informações de contacto
 * Útil se houver campo de email ou nome para rastrear respondentes
 * @param formId ID do formulário
 * @param data Respostas formatadas
 * @param metadata Informações adicionais (email, nome, etc)
 * @returns Objeto com ID da resposta salva
 */
export async function submitFormResponseWithMetadata(
  formId: string,
  data: FormSubmissionData,
  metadata?: {
    email?: string;
    nome?: string;
    ip?: string;
    userAgent?: string;
  }
): Promise<FormSubmissionResponse> {
  try {
    if (!firebaseDb) {
      throw new Error('Firebase não está configurado');
    }

    const responsesCollectionRef = collection(
      firebaseDb,
      'formularios',
      formId,
      'respostas'
    );

    const docRef = await addDoc(responsesCollectionRef, {
      ...data,
      ...(metadata && { metadata }),
      criadoEm: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      criadoEm: serverTimestamp() as Timestamp
    };
  } catch (error) {
    console.error('Erro ao salvar resposta do formulário:', error);
    throw new Error(
      error instanceof Error
        ? `Falha ao enviar formulário: ${error.message}`
        : 'Falha ao enviar formulário.'
    );
  }
}
