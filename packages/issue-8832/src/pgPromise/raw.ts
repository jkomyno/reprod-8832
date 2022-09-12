import { PrismaClient } from '.prisma/client'
import pgPromise from 'pg-promise'
import { cleanDB, createTags } from '../utils/db'
import { readInputParams } from '../utils/io'
import { ReprodParams } from '../utils/RecordParams'

const prisma = new PrismaClient()
const db = pgPromise()(process.env.DATABASE_URL!)

async function getTagsRaw(ids: number[]): Promise<unknown[]> {
  const tags = await db.any<unknown>(`
    SELECT *
    FROM tag
    WHERE "id" IN (${ids.join(', ')})
  `)
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

  console.info(`Querying ${N_RECORDS} records via raw...`)
  const tags = await getTagsRaw(ids)

  console.info(`OK! Retrieved ${tags.length} records.`)

  await db.$pool.end()
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
