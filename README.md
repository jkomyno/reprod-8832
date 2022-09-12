# Reproduction of #8832

## Setup

- Set environment variables:

```bash
export DATABASE_POSTGRES_URL="postgres://prisma:prisma@localhost:5432/tests"
export DATABASE_URL=$DATABASE_POSTGRES_URL
```

- Spin up docker-compose: `docker-compose -f docker/docker-compose.yml up`

## Reproduction

- Install dependencies: `pnpm i`
- `cd packages/issue-8832`
- `export DATABASE_URL=$DATABASE_POSTGRES_URL`
- Push schema to DB: `pnpm prisma:db-push`

### Tests

Tests contain snapshots and several variation of the cases that lead to the underlying issue.

#### With `QUERY_BATCH_SIZE` defined outside the Node.js process:

When `QUERY_BATCH_SIZE` is less than or equal to `32766`, querying more than `32766` records works without errors.

- `QUERY_BATCH_SIZE=32766 pnpm test -- -t 'QUERY_BATCH_SIZE set externally'`
- `QUERY_BATCH_SIZE=1000 pnpm test -- -t 'QUERY_BATCH_SIZE set externally'`

Notice that the following test should fail:

- `QUERY_BATCH_SIZE=32767 pnpm test -- -t 'QUERY_BATCH_SIZE set externally'`

#### Without `QUERY_BATCH_SIZE`, or defining it from `process.env`:

- `pnpm test -- -t 'QUERY_BATCH_SIZE not set externally'`

### Manual Scripts

Manual scripts can optionally be run to observe how different Prisma Client APIs behave w.r.t. a change of parameters,
and help comparing the output with a third-party postgres client like `pg-promise`.

Scripts querying records using the Prisma Client APIs are prefixed with `prisma:`, whereas the ones querying records using `pg-promise` are prefixed with `pg:`.

Scripts support the following parameters (all optional), which are either read from the environment variables (as a default), or
can be supplied from stdin when prompted:

| Parameter        | Description                                               | Type     | Default |
| -----------------| --------------------------------------------------------- | -------- | ------- |
| `N_RECORDS`      | Number of records to create/read                          | `uint`   | `-`     |
| `CREATE_RECORDS` | Wheter to populate the db                                 | `yes|no` | `yes`   |
| `CLEAN_RECORDS`  | Wheter to truncate the db before any other db interaction | `yes|no` | `yes`   |

#### Raw (unparameterized) queries

- `pnpm prisma:raw`
- `pnpm pg:raw`

*Example*:

```bash
N_RECORDS=100000 pnpm prisma:raw
```

which roughly translates to:

```ts
const n = 100000
const ids = Array.from({ length: n }, (_, i) => i + 1)
await prisma.$queryRawUnsafe<unknown[]>(`
    SELECT *
    FROM tag
    WHERE "id" IN (${ids.join(', ')})
`)
```

#### Parameterized queries

- `pnpm prisma:params`
- `pnpm pg:params`

*Example*:

```bash
N_RECORDS=32767 pnpm prisma:params
```

which roughly translates to:

```ts
const n = 32767
const ids = Array.from({ length: n }, (_, i) => i + 1)
const idsParams = ids.map((paramIdx) => `\$${paramIdx}`)

await prisma.$queryRawUnsafe<unknown[]>(`
    SELECT *
    FROM tag
    WHERE "id" IN (${idsParams.join(', ')})
  `, ...ids)
```

#### `findMany` queries

- `pnpm prisma:findMany`

*Example*:

```bash
N_RECORDS=32767 pnpm prisma:findMany
```

which roughly translates to:

```ts
const n = 32766
const ids = Array.from({ length: n }, (_, i) => i + 1)
const tags = await prisma.tag.findMany({
  where: {
    id: {
      in: ids
    }
  }
})
```
