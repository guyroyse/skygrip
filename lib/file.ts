import Optional from '@guyroyse/optional'
import { ulid } from 'ulid'

import {
  client as redisClient,
  ErrorReply,
  RediSearchSchema,
  SchemaFieldTypes,
  SearchOptions,
  SearchReply
} from './redis-client'

export type FileData = {
  id: string
  name: string
  path: string
  notes: string
}

export type FileGenerator = AsyncGenerator<File, void, void>

export class File {
  private static readonly prefix = this.name.toLowerCase()
  private static readonly indexName = `${this.prefix}:index`

  private static readonly schema: RediSearchSchema = {
    '$.path': { type: SchemaFieldTypes.TEXT, AS: 'path', WEIGHT: 2 },
    '$.name': { type: SchemaFieldTypes.TEXT, AS: 'name', WEIGHT: 2 },
    '$.notes': { type: SchemaFieldTypes.TEXT, AS: 'notes' }
  }

  private constructor(
    readonly id: string,
    public path: string,
    public name: string,
    public notes: string
  ) {}

  static async buildIndex() {
    try {
      await redisClient.ft.dropIndex(this.indexName)
    } catch (error) {
      if (error instanceof ErrorReply && error.message !== 'Unknown Index name') throw error
    }

    await redisClient.ft.create(this.indexName, this.schema, {
      ON: 'JSON',
      PREFIX: `${this.prefix}:`
    })
  }

  static create(path: string, name: string, notes: string = ''): File {
    return new File(ulid(), path, name, notes)
  }

  static fetchAll(): FileGenerator {
    return this.fetchMany('*')
  }

  static fetchByKeywords(keywords: string): FileGenerator {
    return this.fetchMany(keywords)
  }

  static async fetchById(id: string): Promise<Optional<File>> {
    const key = `${this.prefix}:${id}`
    const fileData = (await redisClient.json.get(key)) as FileData | null

    if (fileData === null) return Optional.empty()

    const file = new File(fileData.id, fileData.path, fileData.name, fileData.notes)
    return Optional.of(file)
  }

  private static async *fetchMany(query: string): FileGenerator {
    const size = 100
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const options: SearchOptions = {
        LIMIT: { from: offset, size }
      }

      const result: SearchReply = await redisClient.ft.search(this.indexName, query, options)

      for (const document of result.documents) {
        const fileData: FileData = document.value as FileData
        const file = new File(fileData.id, fileData.path, fileData.name, fileData.notes)
        yield file
      }

      hasMore = result.total > offset + size
      offset += size
    }
  }

  get key(): string {
    return `${File.prefix}:${this.id}`
  }

  async save() {
    await redisClient.json.set(this.key, '$', this.toJSON())
  }

  async remove() {
    await redisClient.unlink(this.key)
  }

  toJSON(): FileData {
    return {
      id: this.id,
      path: this.path,
      name: this.name,
      notes: this.notes
    }
  }
}

await File.buildIndex()
