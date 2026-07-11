# Authorization Model

Supabase Auth answers who the browser user is. Company Brain answers what that
user can access.

FastAPI validates Supabase JWT bearer tokens server-side and maps `sub` to
`core.users.supabase_user_id`. The API then resolves memberships from the
database. Browser-supplied organization, business, or domain IDs never grant
access by themselves.

The `/api/v1/auth/me` response contains:

- internal user
- organizations available through active memberships
- businesses available through active memberships
- enabled domains for each business

The frontend must never receive `SUPABASE_SERVICE_ROLE_KEY`.
