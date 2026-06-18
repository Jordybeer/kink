export function moveUp<T>(items: T[], index: number): T[] {
  if (index <= 0 || index >= items.length) return items;
  const next = [...items];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function moveDown<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) return items;
  const next = [...items];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}
