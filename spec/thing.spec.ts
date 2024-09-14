import { Thing, ThingData, ThingIterator } from '$lib/thing'

import Optional from '@guyroyse/optional'

describe('Thing', () => {
  let thing: Thing

  when('created with just a name', () => {
    beforeEach(() => (thing = Thing.create('foo')))

    it('has a valid id', () => expect(thing.id).toBeULID())
    it('has the expected name', () => expect(thing.name).toBe('foo'))
    it('has an empty description', () => expect(thing.description).toBe(''))
  })

  when('created with a name and a description', () => {
    beforeEach(() => (thing = Thing.create('foo', 'bar')))

    it('has a valid id', () => expect(thing.id).toBeULID())
    it('has the expected name', () => expect(thing.name).toBe('foo'))
    it('has the expected description', () => expect(thing.description).toBe('bar'))

    and('saved', () => {
      beforeEach(async () => await thing.save())
      afterEach(async () => await redis.del('thing:' + thing.id))

      it('persists the thing to redis', async () => {
        const thingData = (await redis.json.get('thing:' + thing.id)) as ThingData | null
        expect(thingData).toEqual({
          id: thing.id,
          name: 'foo',
          description: 'bar'
        })
      })

      and('overwritten', () => {
        beforeEach(async () => {
          thing.name = 'baz'
          thing.description = 'qux'
          await thing.save()
        })

        it('updates the thing in redis', async () => {
          const thingData = (await redis.json.get('thing:' + thing.id)) as ThingData | null
          expect(thingData).toEqual({
            id: thing.id,
            name: 'baz',
            description: 'qux'
          })
        })
      })

      and('removed', () => {
        it('removes the thing from redis', async () => {
          await thing.remove()
          const thingData = (await redis.json.get('thing:' + thing.id)) as ThingData | null
          expect(thingData).toBeNull()
        })
      })
    })
  })

  describe('#fetchById', () => {
    let maybeThing: Optional<Thing>

    when('fetching a thing', () => {
      beforeEach(async () => {
        await redis.json.set('thing:abc123', '$', { id: 'abc123', name: 'foo', description: 'bar' })
        maybeThing = await Thing.fetchById('abc123')
      })

      afterEach(async () => await redis.del('thing:abc123'))

      it('has the expected id', () => expect(maybeThing.get().id).toBe('abc123'))
      it('has the expected name', () => expect(maybeThing.get().name).toBe('foo'))
      it('has the expected description', () => expect(maybeThing.get().description).toBe('bar'))
    })

    it('returns empty when fetching a thing that does not exist', async () => {
      maybeThing = await Thing.fetchById('abc123')
      expect(maybeThing.isPresent()).toBe(false)
    })
  })

  describe('#fetchAll', () => {
    let things: ThingIterator

    when('there are things to fetch', () => {
      beforeEach(async () => {
        await redis.json.set('thing:abc123', '$', { id: 'abc123', name: 'foo', description: '' })
        await redis.json.set('thing:def456', '$', { id: 'def456', name: 'bar', description: 'baz' })
        await redis.json.set('thing:ghi789', '$', { id: 'ghi789', name: 'qux', description: '' })
        things = Thing.fetchAll()
      })

      afterEach(async () => {
        await redis.del('thing:abc123')
        await redis.del('thing:def456')
        await redis.del('thing:ghi789')
      })

      it('returns three things', async () => {
        await expect(things).toYieldLength(3)
      })

      it('has the expected things', async () => {
        await expect(things).toYield(
          expect.arrayContaining([
            expect.objectContaining({ id: 'abc123', name: 'foo', description: '' }),
            expect.objectContaining({ id: 'def456', name: 'bar', description: 'baz' }),
            expect.objectContaining({ id: 'ghi789', name: 'qux', description: '' })
          ])
        )
      })
    })

    it('returns an empty array when there are no things to fetch', async () => {
      things = Thing.fetchAll()
      await expect(things).toYieldLength(0)
    })
  })

  describe('#fetchByName', () => {
    let things: ThingIterator

    beforeEach(async () => {
      await redis.json.set('thing:abc123', '$', { id: 'abc123', name: 'foo bar', description: '' })
      await redis.json.set('thing:def456', '$', { id: 'def456', name: 'bar baz', description: 'baz' })
      await redis.json.set('thing:ghi789', '$', { id: 'ghi789', name: 'baz qux', description: '' })
    })

    afterEach(async () => {
      await redis.del('thing:abc123')
      await redis.del('thing:def456')
      await redis.del('thing:ghi789')
    })

    when('looking for a name that is found', () => {
      beforeEach(() => (things = Thing.fetchByName('bar')))

      it('returns three things', async () => {
        await expect(things).toYieldLength(2)
      })

      it('has the expected things', async () => {
        await expect(things).toYield(
          expect.arrayContaining([
            expect.objectContaining({ id: 'abc123', name: 'foo bar', description: '' }),
            expect.objectContaining({ id: 'def456', name: 'bar baz', description: 'baz' })
          ])
        )
      })
    })

    it('returns an empty array when there are no things to fetch', async () => {
      things = Thing.fetchByName('quux')
      await expect(things).toYieldLength(0)
    })
  })
})
