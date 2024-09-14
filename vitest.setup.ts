import { createClient } from 'redis'

export const redis = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect()

export function when(description: string, fn: (this: any) => void): void {
  describe(`when ${description}`, fn)
}

export function and(description: string, fn: (this: any) => void): void {
  describe(`and ${description}`, fn)
}

;(global as any).redis = redis
;(global as any).when = when
;(global as any).and = and

afterAll(async () => {
  await redis.flushAll()
})

expect.extend({
  async toYield<T>(received: AsyncGenerator<T>, expected: Array<T>) {
    const receivedArray: T[] = []

    for await (const value of received) receivedArray.push(value)

    const pass = (this as any).equals(receivedArray, expected)

    if (pass) {
      return {
        message: () => `expected ${receivedArray} not to yield values ${expected}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${receivedArray} to yield values ${expected}`,
        pass: false
      }
    }
  },

  async toYieldLength<T>(received: AsyncGenerator<T>, expected: number) {
    let count = 0

    for await (const _ of received) count++

    const pass = count === expected

    if (pass) {
      return {
        message: () => `expected ${count} not to yield ${expected} values`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${count} to yield ${expected} values`,
        pass: false
      }
    }
  },

  toBeULID(received: string) {
    const pass = /^[0-9A-Z]{26}$/.test(received)

    if (pass) {
      return {
        message: () => `expected ${received} not to be a ULID`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be a ULID`,
        pass: false
      }
    }
  }
})
