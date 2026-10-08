/** `0` and `false` are real values; only absence and the empty string count as empty. */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === ""
}
