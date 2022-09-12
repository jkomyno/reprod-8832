import { PrismaClient } from '.prisma/client'
import { cleanDB, createTags } from '../utils/db'
import { readInputParams } from '../utils/io'
import { ReprodParams } from '../utils/RecordParams'

const prisma = new PrismaClient()

async function getTagsParams(ids: number[]): Promise<unknown[]> {
  const idsParams = ids.map((paramIdx) => `\$${paramIdx}`)

  const tags = await prisma.$queryRawUnsafe<unknown[]>(`
    SELECT *
    FROM tag
    WHERE "id" IN (${idsParams.join(', ')})
  `, ...ids)
  return tags
}

async function main() {
  const env = process.env as { [k in keyof ReprodParams]?: string }
  const { N_RECORDS, CREATE_RECORDS, CLEAN_RECORDS } = await readInputParams(env)

  if (CLEAN_RECORDS) {
    await cleanDB(prisma)()
  }

  const ids = Array.from({ length: N_RECORDS  }, (_, i) => i + 1)

  if (CREATE_RECORDS) {
    await createTags(prisma)(ids)
  }

  console.info(`Querying ${N_RECORDS} records via params...`)
  const tags = await getTagsParams(ids)

  console.info(`OK! Retrieved ${tags.length} records.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
