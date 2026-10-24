import { describe, expect, it } from 'vitest';
import { checkEnvironment, type Capabilities } from './environment';

const ok: Capabilities = { secureContext: true, worker: true, webAssembly: true, subtleCrypto: true, hostname: 'localhost' };

describe('contrôle du navigateur', () => {
  it('accepte un navigateur récent en contexte sécurisé', () => {
    expect(checkEnvironment(ok)).toBeNull();
  });

  it('explique le problème d’une adresse http sur le réseau local', () => {
    expect(checkEnvironment({ ...ok, secureContext: false, hostname: '192.168.1.20' })).toEqual({
      code: 'insecure',
      hostname: '192.168.1.20',
    });
  });

  it('signale un navigateur trop ancien', () => {
    expect(checkEnvironment({ ...ok, webAssembly: false })).toEqual({ code: 'outdated' });
  });
});
