import { firebaseDb, firebaseStorage } from '@/lib/firebase/client';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export type FormType = 'interno' | 'externo';

export type FormAnswerType =
  | 'string'
  | 'number'
  | 'cpf'
  | 'imageFile'
  | 'pdfFile';

export type FileFormAnswerType = Extract<FormAnswerType, 'imageFile' | 'pdfFile'>;

export type FormQuestion = {
  tituloPergunta: string;
  tipoResposta: FormAnswerType;
};

export type CreateFormInput = {
  nomeFormulario: string;
  tipoFormulario: FormType;
  perguntas: FormQuestion[];
  ehFormularioPsel?: boolean;
};

export type StoredForm = CreateFormInput & {
  id: string;
  slug: string;
};

export type FormResponseInput = {
  respostas: Array<{
    tituloPergunta: string;
    tipoResposta: FormAnswerType;
    valor: string;
  }>;
};

export type StoredFormResponse = {
  id: string;
  respostas: FormResponseInput['respostas'];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type UploadExternalFormFileInput = {
  formId: string;
  perguntaTitulo: string;
  tipoResposta: FileFormAnswerType;
  file: File;
};

export type UploadedExternalFormFile = {
  downloadUrl: string;
  storagePath: string;
  originalFileName: string;
  contentType: string;
  sizeInBytes: number;
};

export const PSEL_REQUIRED_QUESTIONS = [
  { key: 'nome', titulo: 'Nome', tipoResposta: 'string', aliases: ['nome'] },
  {
    key: 'sobrenome',
    titulo: 'Sobrenome',
    tipoResposta: 'string',
    aliases: ['sobrenome']
  },
  { key: 'curso', titulo: 'Curso', tipoResposta: 'string', aliases: ['curso'] },
  {
    key: 'periodo',
    titulo: 'Periodo',
    tipoResposta: 'number',
    aliases: ['periodo']
  },
  {
    key: 'telefone',
    titulo: 'Telefone para contato',
    tipoResposta: 'string',
    aliases: ['telefone', 'telefone para contato', 'celular', 'whatsapp']
  },
  {
    key: 'email',
    titulo: 'E-mail para contato',
    tipoResposta: 'string',
    aliases: ['email', 'e-mail', 'email para contato']
  },
  {
    key: 'instagram',
    titulo: 'Qual o seu instagram',
    tipoResposta: 'string',
    aliases: ['instagram', 'qual o seu instagram']
  },
  {
    key: 'origemPsel',
    titulo: 'Por onde voce ficou sabendo do PSEL?',
    tipoResposta: 'string',
    aliases: ['por onde voce ficou sabendo do psel', 'origem psel', 'origem']
  },
  {
    key: 'oQueMove',
    titulo: 'O que te move',
    tipoResposta: 'string',
    aliases: ['o que te move', 'oque te move']
  },
  {
    key: 'porqueWatt',
    titulo: 'Por que voce gostaria de entrar na WATT?',
    tipoResposta: 'string',
    aliases: [
      'por que voce gostaria de entrar na watt',
      'porque voce gostaria de entrar na watt',
      'por que watt',
      'porque watt'
    ]
  },
  {
    key: 'tamanhoCamisa',
    titulo: 'Tamanho da camisa',
    tipoResposta: 'string',
    aliases: ['tamanho da camisa', 'tamanho camisa']
  },
  {
    key: 'curriculumVitaeUrl',
    titulo: 'Curriculum Vitae',
    tipoResposta: 'pdfFile',
    aliases: ['curriculum vitae', 'curriculo', 'curriculo vitae', 'curriculum vitae url']
  },
  {
    key: 'historicoEscolarUrl',
    titulo: 'Historico escolar',
    tipoResposta: 'pdfFile',
    aliases: ['historico escolar', 'historico', 'historico escolar url']
  },
  {
    key: 'imagemUrl',
    titulo: 'Imagem',
    tipoResposta: 'imageFile',
    aliases: ['imagem', 'foto', 'imagem url', 'foto do candidato']
  }
] as const;

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

function toMillis(value: unknown) {
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

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return fileName.slice(dotIndex).toLowerCase();
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function getMissingPselQuestionTitles(perguntas: FormQuestion[]) {
  const normalizedQuestionTitles = new Set(
    perguntas.map((pergunta) => normalizeComparableText(pergunta.tituloPergunta))
  );

  return PSEL_REQUIRED_QUESTIONS.filter((requiredQuestion) => {
    return !requiredQuestion.aliases.some((alias) =>
      normalizedQuestionTitles.has(normalizeComparableText(alias))
    );
  }).map((requiredQuestion) => requiredQuestion.titulo);
}

function validatePselQuestions(perguntas: FormQuestion[]) {
  const missingQuestionTitles = getMissingPselQuestionTitles(perguntas);

  if (missingQuestionTitles.length > 0) {
    throw new Error(
      `Formulario PSEL precisa conter no minimo as perguntas: ${missingQuestionTitles.join(', ')}.`
    );
  }
}

export async function createForm(input: CreateFormInput) {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  if (input.tipoFormulario === 'externo' && input.ehFormularioPsel) {
    validatePselQuestions(input.perguntas);
  }

  const slug = toFormSlug(input.nomeFormulario);
  const collectionName =
    input.tipoFormulario === 'externo' ? 'externForms' : 'internForms';

  const docRef = await addDoc(collection(firebaseDb, collectionName), {
    nomeFormulario: input.nomeFormulario,
    slug,
    tipoFormulario: input.tipoFormulario,
    perguntas: input.perguntas,
    ehFormularioPsel: input.ehFormularioPsel ?? false,
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

export async function submitExternalFormResponse(
  formId: string,
  input: FormResponseInput
) {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  const docRef = await addDoc(collection(firebaseDb, 'externForms', formId, 'respostas'), {
    respostas: input.respostas,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return { id: docRef.id };
}

export async function uploadExternalFormFile(
  input: UploadExternalFormFileInput
): Promise<UploadedExternalFormFile> {
  if (!firebaseStorage) {
    throw new Error('Firebase Storage nao configurado.');
  }

  const timestamp = Date.now();
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const perguntaSlug = toFormSlug(input.perguntaTitulo) || 'arquivo';
  const extension = getFileExtension(input.file.name);
  const storagePath = [
    'externForms',
    input.formId,
    'respostas',
    `${timestamp}-${randomId}`,
    `${perguntaSlug}${extension}`
  ].join('/');

  const storageRef = ref(firebaseStorage, storagePath);
  await uploadBytes(storageRef, input.file, {
    contentType: input.file.type || undefined
  });
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    downloadUrl,
    storagePath,
    originalFileName: input.file.name,
    contentType: input.file.type || '',
    sizeInBytes: input.file.size
  };
}

export async function getLatestExternalPselForm() {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  const pselFormsQuery = query(
    collection(firebaseDb, 'externForms'),
    where('ehFormularioPsel', '==', true)
  );
  const pselFormsSnapshot = await getDocs(pselFormsQuery);

  if (pselFormsSnapshot.empty) {
    return null;
  }

  const sortedDocs = [...pselFormsSnapshot.docs].sort((left, right) => {
    const leftData = left.data();
    const rightData = right.data();

    const leftUpdatedAt = toMillis(leftData.updatedAt ?? leftData.createdAt);
    const rightUpdatedAt = toMillis(rightData.updatedAt ?? rightData.createdAt);

    return rightUpdatedAt - leftUpdatedAt;
  });

  const newestForm = sortedDocs[0];

  return {
    id: newestForm.id,
    ...newestForm.data()
  } as StoredForm;
}

export async function listExternalPselForms(): Promise<StoredForm[]> {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  const pselFormsQuery = query(
    collection(firebaseDb, 'externForms'),
    where('ehFormularioPsel', '==', true)
  );
  const pselFormsSnapshot = await getDocs(pselFormsQuery);

  if (pselFormsSnapshot.empty) {
    return [];
  }

  const sortedDocs = [...pselFormsSnapshot.docs].sort((left, right) => {
    const leftData = left.data();
    const rightData = right.data();

    const leftUpdatedAt = toMillis(leftData.updatedAt ?? leftData.createdAt);
    const rightUpdatedAt = toMillis(rightData.updatedAt ?? rightData.createdAt);

    return rightUpdatedAt - leftUpdatedAt;
  });

  return sortedDocs.map((docSnapshot) => {
    const data = docSnapshot.data() as Omit<StoredForm, 'id'>;
    return {
      id: docSnapshot.id,
      ...data,
      slug: data.slug ?? toFormSlug(data.nomeFormulario ?? docSnapshot.id)
    };
  });
}

export async function getExternalFormResponses(
  formId: string
): Promise<StoredFormResponse[]> {
  if (!firebaseDb) {
    throw new Error('Firebase nao configurado.');
  }

  const respostasSnapshot = await getDocs(
    collection(firebaseDb, 'externForms', formId, 'respostas')
  );

  const sortedResponses = [...respostasSnapshot.docs].sort((left, right) => {
    const leftData = left.data();
    const rightData = right.data();

    const leftUpdatedAt = toMillis(leftData.updatedAt ?? leftData.createdAt);
    const rightUpdatedAt = toMillis(rightData.updatedAt ?? rightData.createdAt);

    return rightUpdatedAt - leftUpdatedAt;
  });

  return sortedResponses.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<StoredFormResponse, 'id'>)
  }));
}
