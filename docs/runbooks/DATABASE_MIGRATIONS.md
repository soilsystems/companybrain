# Database Migrations

All schema changes use Alembic.

```bash
make migration MESSAGE="describe change"
make migrate
```

The first migration creates:

- `core.organizations`
- `core.businesses`
- `core.users`
- `core.memberships`
- `core.domains`
- `core.business_domains`

Use `make seed` after migrations to load the initial domain records.
