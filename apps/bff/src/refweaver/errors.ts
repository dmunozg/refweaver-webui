export class RefweaverHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, string> | null = null
  ) {
    super(message);
    this.name = "RefweaverHttpError";
  }
}

export class RefweaverNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefweaverNetworkError";
  }
}
