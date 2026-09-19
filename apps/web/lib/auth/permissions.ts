export const Roles = {
  ADMIN: "admin",
  COMPRADOR: "comprador",
  VENDEDOR: "vendedor",
  CORREDOR: "corredor",
  EXPORTADOR: "exportador",
  ACOPIO: "acopio",
  INDUSTRIA: "industria",
  INTERMEDIARIO: "intermediario",
} as const;

export type UserRole = (typeof Roles)[keyof typeof Roles];

export function hasRole(userRole: string, requiredRole: UserRole) {
  return userRole === requiredRole;
}