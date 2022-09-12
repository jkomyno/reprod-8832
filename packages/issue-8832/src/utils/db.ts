import type { PrismaClient } from '@prisma/client'

export function cleanDB(prisma: PrismaClient) {
  return () => {
    console.info('Pruning the database records...')
    const cleanPrismaPromises = [prisma.tagsOnPosts.deleteMany(), prisma.post.deleteMany(), prisma.tag.deleteMany()]
    return prisma.$transaction(cleanPrismaPromises)
  }
}

export function createTags(prisma: PrismaClient) {
  return async (ids: number[]) => {
    console.info(`Creating ${ids.length} records...`)
    const data = ids.map((id) => ({ id }))
    await prisma.tag.createMany({
      data,
    })
    return ids
  }
}
