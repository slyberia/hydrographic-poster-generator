export function clearDroneWorkspaceCache() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith("drone-")) keys.push(key);
  }
  keys.forEach((key) => window.sessionStorage.removeItem(key));
}
