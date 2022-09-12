import { z } from 'zod'

/**
 * Type-safe version of `Object.entries`
 */
function objectEntries<T extends { [k: string]: unknown }>(record: T) {
  const entries = Object.entries(record) as {
    [K in keyof T]: [K, T[K]];
  }[keyof T][]

  return entries
}

export function decodePartial<T extends z.ZodRawShape>(record: z.ZodObject<T>) {
  return <I extends { [k in keyof T]?: string }>(input: I) => {
    type Record = z.infer<typeof record>

    // map of key->value pairs that have been successfully decoded from the given input
    // according to the record specification.
    const validated = {} as { [k in keyof Record]: Record[k] } 

    // set of keys that haven't been successfully decoded from the given input,
    // complementary to the keys in `validated`.
    const invalidKeys = new Set<keyof T>()

    objectEntries(record.shape).forEach(([key, zodValue]) => {
      const validationResult = zodValue.safeParse(input[key])
      if (validationResult.success) {
        // @ts-ignore
        validated[key] = validationResult.data
      } else {
        invalidKeys.add(key) 
      }
    })

    return { validated, invalidKeys }
  }
}
