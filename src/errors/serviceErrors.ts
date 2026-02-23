export default class ServiceError extends Error {
  readonly type: string;

  constructor(message: string) {
    super(message);
    this.type = 'ServiceError';
  }
}

export class MissingParameterError extends ServiceError {
  constructor(missingParameters: string[]) {
    super(`Parâmetros "${missingParameters.join('", "')}" são obrigatórios`);
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}

export class EmailServiceError extends ServiceError {
  constructor(message: string) {
    super(message);
  }
}
