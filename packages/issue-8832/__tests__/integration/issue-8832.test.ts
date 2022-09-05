import { PrismaClient } from '../../node_modules/.prisma/client'

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
      expect(e.message).toMatchInlineSnapshot(`
        "
        Invalid \`prisma.tag.findMany()\` invocation in
        /Users/jkomyno/work/prisma/reprod-8832/packages/issue-8832/__tests__/integration/issue-8832.test.ts:79:24

          76 const ids = await createTags(n)
          77 
          78 try {
        → 79   await prisma.tag.findMany(
        Can't reach database server at \`localhost\`:\`5432\`

        Please make sure your database server is running at \`localhost\`:\`5432\`."
      `)

      // @ts-ignore
      expect(e.code).toEqual('P1001')
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
      expect(e.message).toMatchInlineSnapshot(`
        "
        Invalid \`prisma.tag.findMany()\` invocation in
        /Users/jkomyno/work/prisma/reprod-8832/packages/issue-8832/__tests__/integration/issue-8832.test.ts:110:24

          107 await createTags(n)
          108 
          109 try {
        → 110   await prisma.tag.findMany(
        Can't reach database server at \`localhost\`:\`5432\`

        Please make sure your database server is running at \`localhost\`:\`5432\`."
      `)

      // @ts-ignore
      expect(e.code).toEqual('P1001')
    }
  })
})
