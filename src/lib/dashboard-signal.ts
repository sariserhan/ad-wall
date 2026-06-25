// Stack-based signal: last-registered handler wins.
// WallApp pushes when it mounts (overriding the global handler);
// when it unmounts it pops, and the GlobalOwnerDashboard handler resumes.
const stack: Array<() => void> = [];

export function pushDashboardHandler(fn: () => void): () => void {
  stack.push(fn);
  return () => {
    const idx = stack.lastIndexOf(fn);
    if (idx !== -1) stack.splice(idx, 1);
  };
}

export function openDashboard(): void {
  stack[stack.length - 1]?.();
}
