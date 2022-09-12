import ReadLine from 'readline'
import { decodePartialReprodParams, ReprodParams } from './RecordParams'

/**
 * Read the parameters from the given env object, falling back to
 * prompting the user for the missing parameters.
 */
export async function readInputParams(env: { [k in keyof ReprodParams]?: string }) {
  let { validated, invalidKeys } = decodePartialReprodParams(env)
  
  // if we haven't received all needed properties in input, or some of them were invalid,
  // read them from stdin and parse them.
  if (invalidKeys.size > 0) {
    await withReadFromStdin(async prompt => {
      const readFromIO = readFromPrompt(prompt)

      for (const key of invalidKeys) {
        validated = { ...validated, ...(await readFromIO(key)) }
      }
    })
  }

  return validated
}

async function withReadFromStdin(cb: (prompt: (query: string) => Promise<string>) => Promise<void>) {
  const readline = ReadLine.createInterface({ input: process.stdin, output: process.stdout })
  const prompt = (query: string) => new Promise<string>((resolve) => readline.question(query, resolve))

  await cb(prompt)

  readline.close()
}

function readFromPrompt(prompt: (query: string) => Promise<string>) {
  const promptsForParams = {
    CREATE_RECORDS: 'Do you want to create records? (yes/no)',
    CLEAN_RECORDS: 'Do you want to clean records before creating new ones? (yes/no)',
    N_RECORDS: 'Insert number of records: ',
  }

  return async (key: keyof ReprodParams) => {
    const answer = await prompt(promptsForParams[key])
    const value = ReprodParams.shape[key].parse(answer)
    return { key: value }
  }
}
