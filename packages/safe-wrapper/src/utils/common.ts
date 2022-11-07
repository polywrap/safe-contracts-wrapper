export function sameString(str1: string, str2: string): bool {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  return s1 == s2
}

export function findIndex(item: string, items: string[]): i32 {
  for (let i = 0, ln = items.length; i < ln; i++) {
    if (sameString(item, items[i])) {
      return i;
    }
  }
  return -1;
}
