import 'dotenv/config'

export const REDIS_HOST: string = process.env['REDIS_HOST'] ?? 'localhost'
export const REDIS_PORT: number = Number(process.env['REDIS_PORT'] ?? 6379)
export const REDIS_PASSWORD: string | undefined = process.env['REDIS_PASSWORD']
