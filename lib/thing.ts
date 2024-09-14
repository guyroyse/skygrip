import { ulid } from 'ulid'

import Optional from './optional'

import { client as redisClient, ErrorReply, SchemaFieldTypes, SearchOptions, SearchReply } from './redis-client'

export type ThingData = {
  id: string
  name: string
  description: string
}

export type ThingIterator = AsyncGenerator<Thing>

export class Thing {
  private static readonly prefix = this.name.toLowerCase()
  private static readonly indexName = `${this.prefix}:index`

  private constructor(
    readonly id: string,
    public name: string,
    public description: string
  ) {}

  static async buildIndex() {
    try {
      await redisClient.ft.dropIndex(this.indexName)
    } catch (error) {
      if (error instanceof ErrorReply && error.message !== 'Unknown Index name') throw error
    }

    await redisClient.ft.create(
      this.indexName,
      {
        '$.name': { type: SchemaFieldTypes.TEXT, AS: 'name' },
        '$.description': { type: SchemaFieldTypes.TEXT, AS: 'description' }
      },
      {
        ON: 'JSON',
        PREFIX: `${this.prefix}:`
      }
    )
  }

  static create(name: string, description: string = ''): Thing {
    return new Thing(ulid(), name, description)
  }

  static async fetchById(id: string): Promise<Optional<Thing>> {
    const key = `${this.prefix}:${id}`
    const thingData = (await redisClient.json.get(key)) as ThingData | null

    if (thingData === null) return Optional.empty()

    const thing = new Thing(thingData.id, thingData.name, thingData.description)
    return Optional.of(thing)
  }

  static fetchAll(): ThingIterator {
    return this.fetchMany('*')
  }

  static fetchByName(name: string): ThingIterator {
    const query = `@name:${name}`
    return this.fetchMany(query)
  }

  private static async *fetchMany(query: string): ThingIterator {
    const size = 100
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const options: SearchOptions = {
        LIMIT: { from: offset, size }
      }

      const result: SearchReply = await redisClient.ft.search(this.indexName, query, options)

      for (const document of result.documents) {
        const thingData: ThingData = document.value as ThingData
        const thing = new Thing(thingData.id, thingData.name, thingData.description)
        yield thing
      }

      hasMore = result.total > offset + size
      offset += size
    }
  }

  get key(): string {
    return `${Thing.prefix}:${this.id}`
  }

  async save() {
    await redisClient.json.set(this.key, '$', this.toJSON())
  }

  async remove() {
    await redisClient.del(this.key)
  }

  toJSON(): ThingData {
    return {
      id: this.id,
      name: this.name,
      description: this.description
    }
  }
}

await Thing.buildIndex()
