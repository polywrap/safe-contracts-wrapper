export function sameString(str1: string, str2: string): bool {
  return str1.toLowerCase() === str2.toLowerCase();
}

export function findIndex(item: string, items: string[]): i32 {
  for (let i = 0, ln = items.length; i < ln; i++) {
    if (sameString(item, items[i])) {
      return i;
    }
  }
  return -1;
}
