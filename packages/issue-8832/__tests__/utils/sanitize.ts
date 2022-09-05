export function normalizeTmpDir(message: string) {
  return message.replace(/\/(.*)\//g, '/tmp/dir/')
}
