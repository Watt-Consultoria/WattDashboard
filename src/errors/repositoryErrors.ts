export default class RepositoryError extends Error {
  readonly type: string;

  constructor(message: string) {
    super(message);
    this.type = 'RepositoryError';
  }
}

export class MissingParameterError extends RepositoryError {
  constructor(missingParameters: string[]) {
    super(`Parâmetros "${missingParameters.join('", "')}" são obrigatórios`);
  }
}

export class FirebaseError extends RepositoryError {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string) {
    super(message);
  }
}
