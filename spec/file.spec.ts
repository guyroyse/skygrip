import Optional from '@guyroyse/optional'

import { File, FileData, FileGenerator } from '$lib/file'

describe('File', () => {
  let file: File

  when('created with just a path and name', () => {
    beforeEach(() => (file = File.create('/bar/baz', 'foo.png')))

    it('has a valid id', () => expect(file.id).toBeULID())
    it('has the expected path', () => expect(file.path).toBe('/bar/baz'))
    it('has the expected name', () => expect(file.name).toBe('foo.png'))
    it('has empty notes', () => expect(file.notes).toBe(''))
  })

  when('created with a path, a name, and notes', () => {
    beforeEach(() => (file = File.create('/bar/baz', 'foo.png', 'bar bar bar')))

    it('has a valid id', () => expect(file.id).toBeULID())
    it('has the expected path', () => expect(file.path).toBe('/bar/baz'))
    it('has the expected name', () => expect(file.name).toBe('foo.png'))
    it('has the expected notes', () => expect(file.notes).toBe('bar bar bar'))

    and('saved', () => {
      beforeEach(async () => await file.save())
      afterEach(async () => await redis.unlink('file:' + file.id))

      it('persists the file to redis', async () => {
        const fileData = (await redis.json.get('file:' + file.id)) as FileData | null
        expect(fileData).toEqual({
          id: file.id,
          path: '/bar/baz',
          name: 'foo.png',
          notes: 'bar bar bar'
        })
      })

      and('overwritten', () => {
        beforeEach(async () => {
          file.path = '/qux/quux'
          file.name = 'baz.png'
          file.notes = 'qux qux qux'
          await file.save()
        })

        it('updates the file in redis', async () => {
          const fileData = (await redis.json.get('file:' + file.id)) as FileData | null
          expect(fileData).toEqual({
            id: file.id,
            path: '/qux/quux',
            name: 'baz.png',
            notes: 'qux qux qux'
          })
        })
      })

      and('removed', () => {
        it('removes the file from redis', async () => {
          await file.remove()
          const fileData = (await redis.json.get('file:' + file.id)) as FileData | null
          expect(fileData).toBeNull()
        })
      })
    })
  })

  describe('#fetchById', () => {
    let maybeFile: Optional<File>

    when('fetching a file', () => {
      beforeEach(async () => {
        await addFileToRedis('file:abc123', 'abc123', '/bar/baz', 'foo.png', 'bar bar bar')
        maybeFile = await File.fetchById('abc123')
      })

      afterEach(async () => await redis.del('file:abc123'))

      it('has the expected id', () => expect(maybeFile.get().id).toBe('abc123'))
      it('has the expected path', () => expect(maybeFile.get().path).toBe('/bar/baz'))
      it('has the expected name', () => expect(maybeFile.get().name).toBe('foo.png'))
      it('has the expected notes', () => expect(maybeFile.get().notes).toBe('bar bar bar'))
    })

    it('returns empty when fetching a file that does not exist', async () => {
      maybeFile = await File.fetchById('abc123')
      expect(maybeFile.isPresent()).toBe(false)
    })
  })

  when('there are no files to fetch', () => {
    describe('#fetchAll', () => {
      let files: FileGenerator

      it('returns an empty array', async () => {
        files = File.fetchAll()
        await expect(files).toYieldLength(0)
      })
    })

    describe('#fetchByKeywords', () => {
      let files: FileGenerator

      it('returns an empty array', async () => {
        files = File.fetchByKeywords('foo bar baz qux')
        await expect(files).toYieldLength(0)
      })
    })
  })

  when('there are files to fetch', () => {
    let files: FileGenerator

    beforeAll(async () => {
      await addFileToRedis('file:abc123', 'abc123', '/foo/bar', 'foo-bar.png', 'foo foo foo')
      await addFileToRedis('file:def456', 'def456', '/foo/baz', 'foo-baz.png', 'bar bar bar')
      await addFileToRedis('file:ghi789', 'ghi789', '/bar/baz', 'bar-baz.png', 'qux qux qux')
    })

    afterAll(async () => {
      await redis.del('file:abc123')
      await redis.del('file:def456')
      await redis.del('file:ghi789')
    })

    describe('#fetchAll', () => {
      beforeEach(async () => (files = File.fetchAll()))

      it('returns three files', async () => {
        await expect(files).toYieldLength(3)
      })

      it('has the expected files', async () => {
        await expect(files).toYield(
          expect.arrayContaining([
            expect.objectContaining({ id: 'abc123', path: '/foo/bar', name: 'foo-bar.png', notes: 'foo foo foo' }),
            expect.objectContaining({ id: 'def456', path: '/foo/baz', name: 'foo-baz.png', notes: 'bar bar bar' }),
            expect.objectContaining({ id: 'ghi789', path: '/bar/baz', name: 'bar-baz.png', notes: 'qux qux qux' })
          ])
        )
      })
    })

    describe('#fetchByKeywords', () => {
      when('looking for a name that is found', () => {
        beforeEach(() => (files = File.fetchByKeywords('foo bar')))

        it('returns three files', async () => {
          await expect(files).toYieldLength(2)
        })

        it('has the expected files', async () => {
          await expect(files).toYield(
            expect.arrayContaining([
              expect.objectContaining({ id: 'abc123', path: '/foo/bar', name: 'foo-bar.png', notes: 'foo foo foo' }),
              expect.objectContaining({ id: 'def456', path: '/foo/baz', name: 'foo-baz.png', notes: 'bar bar bar' })
            ])
          )
        })
      })

      it('returns an empty array when there are no matching file', async () => {
        files = File.fetchByKeywords('foo bar baz qux')
        await expect(files).toYieldLength(0)
      })
    })
  })
})

async function addFileToRedis(key: string, id: string, path: string, name: string, notes: string) {
  await redis.json.set(key, '$', { id, path, name, notes })
}
