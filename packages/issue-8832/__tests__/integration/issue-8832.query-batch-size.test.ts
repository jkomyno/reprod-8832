import { PrismaClient } from '.prisma/client'
import { normalizeTmpDir } from '../utils/sanitize'

const prisma = new PrismaClient()

async function createTags(length: number): Promise<number[]> {
  const ids = Array.from({ length }, (_, i) => i + 1)
  const data = ids.map((id) => ({ id }))
  await prisma.tag.createMany({
    data,
  })
  return ids
}

async function clean() {
  const cleanPrismaPromises = [prisma.tagsOnPosts.deleteMany(), prisma.post.deleteMany(), prisma.tag.deleteMany()]
  await prisma.$transaction(cleanPrismaPromises)
}

describe('QUERY_BATCH_SIZE set externally', () => {
  it('process.env.QUERY_BATCH_SIZE is already set', async () => {
    expect(process.env.QUERY_BATCH_SIZE).toBeDefined()
    expect(isNaN(parseInt(process.env.QUERY_BATCH_SIZE || ''))).toBeFalsy()
  })

  describe('issue #8832 with 32766 elements', () => {
    const n = 32766

    beforeEach(async () => {
      await clean()
    }, 10_000)

    it('$queryRaw fails', async () => {
      expect.assertions(2)
      const ids = await createTags(n)

      try {
        await prisma.$queryRaw<unknown[]>`
        SELECT *
        FROM tag
        WHERE "id" IN (${ids.join(', ')})
      `
      } catch (error) {
        const e = error as Error
        expect(normalizeTmpDir(e.message)).toMatchInlineSnapshot(`
          "
          Invalid \`prisma.$queryRaw()\` invocation:


          Raw query failed. Code: \`42883\`. Message: \`db error: ERROR: operator does not exist: integer = text
          HINT: No operator matches the given name and argument type(s). You might need to add explicit type casts.\`"
        `)

        // @ts-ignore
        expect(e.code).toEqual('P2010')
      }
    })

    it('$queryRawUnsafe succeeds', async () => {
      const ids = await createTags(n)
      const tags = await prisma.$queryRawUnsafe<unknown[]>(`
        SELECT * FROM tag
        WHERE id IN (${ids.join(',')})
        ORDER BY id ASC
      `)
      expect(tags).toHaveLength(n)
    })
  
    it('IN succeeds', async () => {
      const ids = await createTags(n)
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: ids },
        },
      })
      expect(tags).toHaveLength(n)
    })
  
    it('INCLUDE succeeds', async () => {
      await createTags(n)
      const tags = await prisma.tag.findMany({
        include: {
          posts: true,
        },
      })
      expect(tags).toHaveLength(n)
    })
  })

  describe('issue #8832 with 32767 elements', () => {
    const n = 32767

    beforeEach(async () => {
      await clean()
    }, 10_000)
  
    it('$queryRaw succeeds', async () => {
      const ids = await createTags(n)
      const tags = await prisma.$queryRawUnsafe<unknown[]>(`
        SELECT * FROM tag
        WHERE id IN (${ids.join(',')})
        ORDER BY id ASC
      `)
      expect(tags).toHaveLength(n)
    })

    it('IN succeeds', async () => {
      const ids = await createTags(n)
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: ids },
        },
      })
      expect(tags).toHaveLength(n)
    })
  
    it('INCLUDE succeeds', async () => {
      await createTags(n)
      const tags = await prisma.tag.findMany({
        include: {
          posts: true,
        },
      })
      expect(tags).toHaveLength(n)
    })
  })
})
