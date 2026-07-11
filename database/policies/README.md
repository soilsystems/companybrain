# Database Policies

Supabase row-level security policies will be added after the API authorization
model is exercised against real application flows. The current boundary is:

- browser clients authenticate with Supabase Auth;
- FastAPI validates Supabase JWTs;
- FastAPI resolves memberships and enabled domains server-side;
- service-role credentials never reach frontend code.
