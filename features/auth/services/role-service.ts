export type UserRole = "admin" | "supervisor" | "agent";

type Permission =
  | "tickets:read"
  | "tickets:assign"
  | "tickets:manage-tags"
  | "workflows:read"
  | "workflows:manage"
  | "saved-replies:read"
  | "saved-replies:manage"
  | "analytics:read"
  | "ai-logs:read"
  | "audit-logs:read"
  | "email-logs:read"
  | "users:manage";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "tickets:read",
    "tickets:assign",
    "tickets:manage-tags",
    "workflows:read",
    "workflows:manage",
    "saved-replies:read",
    "saved-replies:manage",
    "analytics:read",
    "ai-logs:read",
    "audit-logs:read",
    "email-logs:read",
    "users:manage",
  ],
  supervisor: [
    "tickets:read",
    "tickets:assign",
    "tickets:manage-tags",
    "workflows:read",
    "saved-replies:read",
    "saved-replies:manage",
    "analytics:read",
    "ai-logs:read",
    "audit-logs:read",
    "email-logs:read",
  ],
  agent: [
    "tickets:read",
    "tickets:assign",
    "tickets:manage-tags",
    "saved-replies:read",
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = rolePermissions[role as UserRole];

  if (!perms) return false;

  return perms.includes(permission);
}

export function getPermissions(role: string): Permission[] {
  return rolePermissions[role as UserRole] ?? [];
}

export function isElevatedRole(role: string): boolean {
  return role === "admin" || role === "supervisor";
}
