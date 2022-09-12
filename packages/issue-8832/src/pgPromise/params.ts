import { PrismaClient } from '.prisma/client'
import pgPromise, { ParameterizedQuery as PQ } from 'pg-promise'
import { cleanDB, createTags } from '../utils/db'
import { readInputParams } from '../utils/io'
import { ReprodParams } from '../utils/RecordParams'

const prisma = new PrismaClient()
const db = pgPromise()(process.env.DATABASE_URL!)

async function getTagsParams(ids: number[]): Promise<unknown[]> {
  const idsParams = ids
    .map((_, i) => i + 1)
    .map((paramIdx) => `\$${paramIdx}`)

  const findManyTags = new PQ({
    text: `
      SELECT *
      FROM tag
      WHERE "id" IN (${idsParams.join(', ')})
    `,
    values: ids,
  })
  const tags = await db.any<unknown>(findManyTags)
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

  await db.$pool.end()
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
