import { firebaseDb } from '@/lib/firebase/client';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';

export type FormType = 'interno' | 'externo';

export type FormAnswerType =
  | 'string'
  | 'number'
  | 'cpf'
  | 'imageFile'
  | 'pdfFile';

export type FormQuestion = {
  tituloPergunta: string;
  tipoResposta: FormAnswerType;
};

export type CreateFormInput = {
  nomeFormulario: string;
  tipoFormulario: FormType;
  perguntas: FormQuestion[];
};

export type StoredForm = CreateFormInput & {
  id: string;
  slug: string;
};

function toFormSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function createForm(input: CreateFormInput) {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  const slug = toFormSlug(input.nomeFormulario);
  const collectionName =
    input.tipoFormulario === 'externo' ? 'externForms' : 'internForms';

  const docRef = await addDoc(collection(firebaseDb, collectionName), {
    nomeFormulario: input.nomeFormulario,
    slug,
    tipoFormulario: input.tipoFormulario,
    perguntas: input.perguntas,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    collectionName,
    slug
  };
}

export async function getExternalFormByPathName(pathName: string) {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  const decodedName = decodeURIComponent(pathName).trim();
  const slug = toFormSlug(decodedName);

  const bySlugQuery = query(
    collection(firebaseDb, 'externForms'),
    where('slug', '==', slug),
    limit(1)
  );
  const bySlugSnapshot = await getDocs(bySlugQuery);

  if (!bySlugSnapshot.empty) {
    const docSnapshot = bySlugSnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as StoredForm;
  }

  const byNameQuery = query(
    collection(firebaseDb, 'externForms'),
    where('nomeFormulario', '==', decodedName),
    limit(1)
  );
  const byNameSnapshot = await getDocs(byNameQuery);

  if (!byNameSnapshot.empty) {
    const docSnapshot = byNameSnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as StoredForm;
  }

  return null;
}
