export const normalizePermissionValue = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const isExecutiveAssessor = (
  member?: {
    role?: string | null;
    sector?: string | null;
  } | null
) => {
  const role = normalizePermissionValue(member?.role);
  const sector = normalizePermissionValue(member?.sector);

  return (
    (role === 'assessor' || role === 'asessor' || role === 'acessor') &&
    sector === 'executivo'
  );
};

export const isDiretoria = (member?: { role?: string | null } | null) => {
  const role = normalizePermissionValue(member?.role);

  return role === 'diretor' || role === 'presidente';
};

export const canAccessFinanceCashbook = (
  member?: {
    role?: string | null;
    sector?: string | null;
  } | null
) => {
  const role = normalizePermissionValue(member?.role);
  const sector = normalizePermissionValue(member?.sector);

  return (
    role === 'presidente executivo' ||
    role === 'assessor executivo' ||
    ((role === 'presidente' ||
      role === 'assessor' ||
      role === 'asessor' ||
      role === 'acessor') &&
      sector === 'executivo')
  );
};
