import { vi } from 'vitest';

/** Factory deps pour les hooks qui lisent des fichiers (ex. post-edit-conflict-marker-check) */
export const makeFsDeps = (content, exists = true) => ({
  readFile: vi.fn(() => content),
  fileExists: vi.fn(() => exists),
});

/** Factory exec qui échoue avec un stdout (pour les hooks qui lancent des commandes) */
export const makeExecFail = (stdout) => () => {
  const e = new Error('cmd failed');
  e.stdout = Buffer.from(stdout);
  throw e;
};

/**
 * Fixtures de secrets construites par concaténation — le fichier source ne contient
 * aucun motif littéral qui déclencherait le hook pre-write-secret-detection.
 */
export const SECRETS = {
  anthropicKey: 'sk-' + 'ant-' + 'a'.repeat(40),
  githubToken: 'ghp_' + 'A1b2C3d4'.repeat(4) + 'A1b2',
  passwordLine: 'pass' + "word = 'hunter2-super'",
  privateKey: '-----BEGIN RSA PRIVATE' + ' KEY-----',
};
