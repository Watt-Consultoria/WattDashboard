import type IFormRepository from '@/types/forms/form-repository';
import type {
  Form,
  CreateFormInput,
  UpdateFormInput,
  FormQuestion
} from '@/types/forms/form';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase/client';
import {
  FirebaseError,
  MissingParameterError
} from '@/errors/repositoryErrors';

function generateSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const toMillisFn = (value as { toMillis?: () => number }).toMillis;
    if (typeof toMillisFn === 'function') {
      return toMillisFn.call(value);
    }
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

class FormRepository implements IFormRepository {
  async getAllForms(): Promise<Form[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');

    const formsRef = collection(firebaseDb, 'externForms');

    const snapshot = await getDocs(formsRef);

    const docs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nome: data.nome ?? '',
        descricao: data.descricao,
        tipo: data.tipo ?? data.tipo,
        slug: data.slug ?? generateSlug(data.nome ?? ''),
        perguntas: Array.isArray(data.perguntas) ? data.perguntas : [],
        ativa: data.ativa ?? true,
        criadoEm: data.criadoEm ?? Timestamp.now(),
        atualizadoEm: data.atualizadoEm ?? Timestamp.now()
      } as Form;
    });

    // Ordenar por data de atualização (mais recentes primeiro)
    return docs.sort((a, b) => {
      const timeA = toMillis(a.atualizadoEm);
      const timeB = toMillis(b.atualizadoEm);
      return timeB - timeA;
    });
  }

  async listFormsByType(tipo: string): Promise<Form[]> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!tipo) throw new MissingParameterError(['tipo']);

    const q = query(
      collection(firebaseDb, 'externForms'),
      where('tipo', '==', tipo)
    );
    const snapshot = await getDocs(q);

    const docs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nome: data.nome ?? '',
        descricao: data.descricao,
        tipo: data.tipo ?? tipo,
        slug: data.slug ?? generateSlug(data.nome ?? ''),
        perguntas: Array.isArray(data.perguntas) ? data.perguntas : [],
        ativa: data.ativa ?? true,
        criadoEm: data.criadoEm ?? Timestamp.now(),
        atualizadoEm: data.atualizadoEm ?? Timestamp.now()
      } as Form;
    });

    // Ordenar por data de atualização (mais recentes primeiro)
    return docs.sort((a, b) => {
      const timeA = toMillis(a.atualizadoEm);
      const timeB = toMillis(b.atualizadoEm);
      return timeB - timeA;
    });
  }

  async getFormById(id: string): Promise<Form | null> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!id) throw new MissingParameterError(['id']);

    const docSnap = await getDocs(
      query(collection(firebaseDb, 'externForms'), where('__name__', '==', id))
    );

    if (docSnap.empty) {
      // Fallback: tentar acessar direto por caminho
      try {
        const directRef = doc(firebaseDb, 'externForms', id);
        const directSnap = await getDocs(
          query(
            collection(firebaseDb, 'externForms'),
            where('__name__', '==', id)
          )
        );
        if (directSnap.empty) return null;

        const data = directSnap.docs[0].data();
        return {
          id: directSnap.docs[0].id,
          nome: data.nome ?? '',
          descricao: data.descricao,
          tipo: data.tipo,
          slug: data.slug ?? generateSlug(data.nome ?? ''),
          perguntas: Array.isArray(data.perguntas) ? data.perguntas : [],
          ativa: data.ativa ?? true,
          criadoEm: data.criadoEm ?? Timestamp.now(),
          atualizadoEm: data.atualizadoEm ?? Timestamp.now()
        } as Form;
      } catch {
        return null;
      }
    }

    const data = docSnap.docs[0].data();
    return {
      id: docSnap.docs[0].id,
      nome: data.nome ?? '',
      descricao: data.descricao,
      tipo: data.tipo,
      slug: data.slug ?? generateSlug(data.nome ?? ''),
      perguntas: Array.isArray(data.perguntas) ? data.perguntas : [],
      ativa: data.ativa ?? true,
      criadoEm: data.criadoEm ?? Timestamp.now(),
      atualizadoEm: data.atualizadoEm ?? Timestamp.now()
    } as Form;
  }

  async getFormBySlug(slug: string): Promise<Form | null> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!slug) throw new MissingParameterError(['slug']);

    const q = query(
      collection(firebaseDb, 'externForms'),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    return {
      id: docSnap.id,
      nome: data.nome ?? '',
      descricao: data.descricao,
      tipo: data.tipo,
      slug: data.slug ?? slug,
      perguntas: Array.isArray(data.perguntas) ? data.perguntas : [],
      ativa: data.ativa ?? true,
      criadoEm: data.criadoEm ?? Timestamp.now(),
      atualizadoEm: data.atualizadoEm ?? Timestamp.now()
    } as Form;
  }

  async createForm(input: CreateFormInput): Promise<Form> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!input.nome || !input.tipo)
      throw new MissingParameterError(['nome', 'tipo']);
    if (!Array.isArray(input.perguntas) || input.perguntas.length === 0) {
      throw new Error('Formulário deve conter pelo menos uma pergunta');
    }

    const slug = generateSlug(input.nome);
    const now = Timestamp.now();

    const docRef = await addDoc(collection(firebaseDb, 'externForms'), {
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() ?? '',
      tipo: input.tipo,
      slug,
      perguntas: input.perguntas,
      ativa: true,
      criadoEm: now,
      atualizadoEm: now
    });

    return {
      id: docRef.id,
      nome: input.nome.trim(),
      descricao: input.descricao?.trim(),
      tipo: input.tipo,
      slug,
      perguntas: input.perguntas as FormQuestion[],
      ativa: true,
      criadoEm: now,
      atualizadoEm: now
    };
  }

  async updateForm(id: string, input: UpdateFormInput): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!id) throw new MissingParameterError(['id']);
    if (Object.keys(input).length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    const updateData: Record<string, any> = {
      atualizadoEm: serverTimestamp()
    };

    if (input.nome) {
      updateData.nome = input.nome.trim();
      updateData.slug = generateSlug(input.nome);
    }

    if (input.descricao !== undefined) {
      updateData.descricao = input.descricao?.trim() ?? '';
    }

    if (input.perguntas) {
      if (!Array.isArray(input.perguntas) || input.perguntas.length === 0) {
        throw new Error('Formulário deve conter pelo menos uma pergunta');
      }
      updateData.perguntas = input.perguntas satisfies FormQuestion[];
    }

    if (input.ativa !== undefined) {
      updateData.ativa = input.ativa;
    }

    const docRef = doc(firebaseDb, 'externForms', id);
    await updateDoc(docRef, updateData);
  }

  async deleteForm(id: string): Promise<void> {
    if (!firebaseDb) throw new FirebaseError('Firebase não está configurado');
    if (!id) throw new MissingParameterError(['id']);

    const docRef = doc(firebaseDb, 'externForms', id);
    await deleteDoc(docRef);
  }
}

const formRepository = new FormRepository();
export default formRepository;
