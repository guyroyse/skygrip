export default class Optional<T> {
  private constructor(private value: T | null) {}

  public static of<T>(value: T): Optional<T> {
    if (value !== null && value !== undefined) return new Optional(value)
    throw new Error('Cannot create Optional of null or undefined')
  }

  public static empty<T>(): Optional<T> {
    return new Optional<T>(null)
  }

  public isPresent(): boolean {
    return this.value !== null
  }

  public get(): T {
    if (this.value !== null) return this.value
    throw new Error('No value present')
  }

  public orElse(other: T): T {
    return this.value === null ? other : this.value
  }
}
