type LogoutStore = {
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
};

export async function logout(tokenHash: string | null, store: LogoutStore): Promise<void> {
  if (!tokenHash) {
    return;
  }

  await store.deleteSessionByTokenHash(tokenHash);
}
