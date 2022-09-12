import { z } from 'zod'
import { decodePartial } from './decodePartial'

const NonNegativeIntegerFromString = z.string()
  .transform(s => parseInt(s, 10))
  .refine(n => Number.isInteger(n) && n >= 0)
  .brand<'NonNegativeInteger'>()

const BooleanFromString = z.union([z.literal('yes'), z.literal('no')])
  .transform(s => s === 'yes')

export const ReprodParams = z.object({
  N_RECORDS: NonNegativeIntegerFromString,
  CREATE_RECORDS: BooleanFromString.default('yes'),
  CLEAN_RECORDS: BooleanFromString.default('yes'),
})
export type ReprodParams = z.infer<typeof ReprodParams>

export const decodePartialReprodParams = decodePartial(ReprodParams)
