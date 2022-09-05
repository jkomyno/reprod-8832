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
- `pnpm test`
