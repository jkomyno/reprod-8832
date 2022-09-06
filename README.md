## Reproduction of #8832

### Setup

- Set environment variables:

```bash
export DATABASE_POSTGRES_URL="postgres://prisma:prisma@localhost:5432/tests"
export DATABASE_URL=$DATABASE_POSTGRES_URL
```

- Spin up docker-compose: `docker-compose -f docker/docker-compose.yml up`

### Reproduction

- `pnpm i`
- `cd packages/issue-8832`
- `export DATABASE_URL=$DATABASE_POSTGRES_URL`
- `pnpx prisma db push`

#### With `QUERY_BATCH_SIZE` defined outside the Node.js process 

When `QUERY_BATCH_SIZE` is less than or equal to `32766`, querying more than `32766` records works without errors.

- `QUERY_BATCH_SIZE=32766 pnpm test -- -t 'QUERY_BATCH_SIZE set externally'`
- `QUERY_BATCH_SIZE=1000 pnpm test -- -t 'QUERY_BATCH_SIZE set externally'`

Notice that the following test should fail:

- `QUERY_BATCH_SIZE=32767 pnpm test -- -t 'QUERY_BATCH_SIZE set externally'`

#### Without `QUERY_BATCH_SIZE`, or defining it from `process.env`:

- `pnpm test -- -t 'QUERY_BATCH_SIZE not set externally'`
