import type { Form, CreateFormInput, UpdateFormInput } from './form';

export default interface IFormRepository {
  listFormsByType(tipo: string): Promise<Form[]>;
  getFormById(id: string): Promise<Form | null>;
  getFormBySlug(slug: string): Promise<Form | null>;
  createForm(input: CreateFormInput): Promise<Form>;
  updateForm(id: string, input: UpdateFormInput): Promise<void>;
  deleteForm(id: string): Promise<void>;
}
