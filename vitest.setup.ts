export function when(description: string, fn: (this: any) => void): void {
  describe(`when ${description}`, fn)
}

export function and(description: string, fn: (this: any) => void): void {
  describe(`and ${description}`, fn)
}

;(global as any).when = when
;(global as any).and = and
