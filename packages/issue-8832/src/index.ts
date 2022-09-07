import { PrismaClient } from '../node_modules/.prisma/client'
import ReadLine from 'readline'

const prisma = new PrismaClient()

const readline = ReadLine.createInterface({ input: process.stdin, output: process.stdout })
const prompt = (query: string) => new Promise<string>((resolve) => readline.question(query, resolve))

async function readNRecords(): Promise<number> {
  const nAsStr = await prompt('Insert # of records: ')
  const n = parseInt(nAsStr, 10)
  return n
}

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

async function main() {
  const n = await readNRecords()
  readline.close()

  console.info('Pruning the database...')
  await clean()

  console.info(`Creating ${n} tags...`)
  const ids = await createTags(n)

  console.info(`Querying ${n} tags via IN...`)
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: ids },
    },
  })

  console.info(`Retrieved ${tags.length} tags.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
