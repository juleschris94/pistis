/**
 * Établissements proposés à l'import. L'identifiant est stocké dans la base ; le nom s'affiche tel quel
 * (nom commercial, identique dans toutes les langues). « other » couvre toutes les autres banques.
 */
export const INSTITUTIONS = [
  { id: 'labanquepostale', name: 'La Banque Postale' },
  { id: 'boursobank', name: 'BoursoBank' },
  { id: 'hellobank', name: 'Hello bank!' },
  { id: 'revolut', name: 'Revolut' },
  { id: 'lcl', name: 'LCL' },
  { id: 'creditagricole', name: 'Crédit Agricole' },
  { id: 'bnpparibas', name: 'BNP Paribas' },
  { id: 'swile', name: 'Swile' },
  { id: 'other', name: '' },
] as const;

export type InstitutionId = (typeof INSTITUTIONS)[number]['id'];

export function isInstitutionId(value: string): value is InstitutionId {
  return INSTITUTIONS.some((i) => i.id === value);
}

export const ACCOUNT_KINDS = ['checking', 'savings', 'card', 'meal', 'other'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];
