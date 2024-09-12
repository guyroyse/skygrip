export {}

declare global {
  function when(description: string, fn: (this: any) => void): void
  function and(description: string, fn: (this: any) => void): void
}
