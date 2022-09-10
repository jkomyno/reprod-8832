import { PrismaClient } from '../../node_modules/.prisma/client'
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

describe('QUERY_BATCH_SIZE not set externally', () => {
  it('process.env.QUERY_BATCH_SIZE is not set', async () => {
    expect(process.env.QUERY_BATCH_SIZE).not.toBeDefined()
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

    it('$queryRaw unsafe succeeds', async () => {
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

    it('IN fails with misleading error', async () => {
      expect.assertions(2)
      const ids = await createTags(n)

      try {
        await prisma.tag.findMany({
          where: {
            id: { in: ids },
          },
        })
      } catch (error) {
        const e = error as Error
        expect(normalizeTmpDir(e.message)).toMatchInlineSnapshot(`
          "
          Invalid \`prisma.tag.findMany()\` invocation in
          /tmp/dir/issue-8832.test.ts:95:26

            92 const ids = await createTags(n)
            93 
            94 try {
          → 95   await prisma.tag.findMany(
          Can't reach database server at \`localhost\`:\`5432\`

          Please make sure your database server is running at \`localhost\`:\`5432\`."
        `)

        // @ts-ignore
        expect(e.code).toEqual('P1001')
      }
    })

    it('IN fails with misleading error even when QUERY_BATCH_SIZE is locally set to a high number', async () => {
      const env = { ...process.env }
      process.env.QUERY_BATCH_SIZE = (n - 1).toString()

      expect.assertions(2)
      const ids = await createTags(n)

      try {
        await prisma.tag.findMany({
          where: {
            id: { in: ids },
          },
        })
      } catch (error) {
        const e = error as Error
        expect(normalizeTmpDir(e.message)).toMatchInlineSnapshot(`
          "
          Invalid \`prisma.tag.findMany()\` invocation in
          /tmp/dir/issue-8832.test.ts:129:26

            126 const ids = await createTags(n)
            127 
            128 try {
          → 129   await prisma.tag.findMany(
          Can't reach database server at \`localhost\`:\`5432\`

          Please make sure your database server is running at \`localhost\`:\`5432\`."
        `)

        // @ts-ignore
        expect(e.code).toEqual('P1001')
      } finally {
        process.env = env
      }
    })

    it('INCLUDE fails with misleading error', async () => {
      expect.assertions(2)
      await createTags(n)

      try {
        await prisma.tag.findMany({
          include: {
            posts: true,
          },
        })
      } catch (error) {
        const e = error as Error
        expect(normalizeTmpDir(e.message)).toMatchInlineSnapshot(`
          "
          Invalid \`prisma.tag.findMany()\` invocation in
          /tmp/dir/issue-8832.test.ts:162:26

            159 await createTags(n)
            160 
            161 try {
          → 162   await prisma.tag.findMany(
          Can't reach database server at \`localhost\`:\`5432\`

          Please make sure your database server is running at \`localhost\`:\`5432\`."
        `)

        // @ts-ignore
        expect(e.code).toEqual('P1001')
      }
    })

    it('INCLUDE fails with misleading error even when QUERY_BATCH_SIZE is locally set to a high number', async () => {
      const env = { ...process.env }
      process.env.QUERY_BATCH_SIZE = (n - 1).toString()

      expect.assertions(2)
      await createTags(n)

      try {
        await prisma.tag.findMany({
          include: {
            posts: true,
          },
        })
      } catch (error) {
        const e = error as Error
        expect(normalizeTmpDir(e.message)).toMatchInlineSnapshot(`
          "
          Invalid \`prisma.tag.findMany()\` invocation in
          /tmp/dir/issue-8832.test.ts:196:26

            193 await createTags(n)
            194 
            195 try {
          → 196   await prisma.tag.findMany(
          Can't reach database server at \`localhost\`:\`5432\`

          Please make sure your database server is running at \`localhost\`:\`5432\`."
        `)

        // @ts-ignore
        expect(e.code).toEqual('P1001')
      } finally {
        process.env = env
      }
    })
  })
})
