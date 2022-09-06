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
          /tmp/dir/issue-8832.test.ts:85:26

            82 const ids = await createTags(n)
            83 
            84 try {
          → 85   await prisma.tag.findMany(
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
          /tmp/dir/issue-8832.test.ts:119:26

            116 const ids = await createTags(n)
            117 
            118 try {
          → 119   await prisma.tag.findMany(
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
          /tmp/dir/issue-8832.test.ts:152:26

            149 await createTags(n)
            150 
            151 try {
          → 152   await prisma.tag.findMany(
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
          /tmp/dir/issue-8832.test.ts:186:26

            183 await createTags(n)
            184 
            185 try {
          → 186   await prisma.tag.findMany(
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
