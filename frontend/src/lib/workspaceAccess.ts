export const WORKSPACE_ROOT = "/workspace";
export const DRONE_WORKSPACE_ROOT = `${WORKSPACE_ROOT}/drone`;

export const APP_ROLES = ["viewer", "analyst", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function requestedWorkspaceDestination(requested: string | null): string {
  if (
    requested === WORKSPACE_ROOT ||
    requested?.startsWith(`${WORKSPACE_ROOT}/`)
  ) {
    return requested;
  }
  return WORKSPACE_ROOT;
}
