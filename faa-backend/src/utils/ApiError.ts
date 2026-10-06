export class ApiError extends Error {
  public status: number;
  public details?: unknown;
  public code?: string;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(msg = 'Solicitud inválida', details?: unknown) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'No autorizado') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Acceso denegado') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'No encontrado') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflicto') {
    return new ApiError(409, msg);
  }
}
