export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const notFound = (what: string): HttpError => new HttpError(404, `${what} not found`)
export const badRequest = (message: string): HttpError => new HttpError(400, message)
