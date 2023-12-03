export class SystemError extends Error {
  static {
    this.prototype.name = 'SystemError'
  }
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

export class GitRepositoryNotFoundError extends Error {
  static {
    this.prototype.name = 'GitRepositoryNotFoundError'
  }
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}