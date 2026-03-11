type PostgresError = {
  code?: string;
};

export function isUniqueViolation(error: unknown): error is PostgresError {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (error as PostgresError).code === "23505";
}
