import 'vitest'

import { createClient } from 'redis'

export type RedisConnection = ReturnType<typeof createClient>

export {}

declare global {
  function when(description: string, fn: (this: any) => void): void
  function and(description: string, fn: (this: any) => void): void
  let redis: RedisConnection
}

declare module 'vitest' {
  interface Assertion<T = any> {
    toYield(expected: Array<T>): Promise<void>
    toYieldLength(expected: number): Promise<void>
    toBeULID(): void
  }

  interface AsymmetricMatchersContaining {
    toYield(expected: Array<any>): Promise<void>
    toYieldLength(expected: number): Promise<void>
    toBeULID(): void
  }
}
