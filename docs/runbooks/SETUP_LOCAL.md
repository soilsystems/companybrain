# Setup Local

```bash
make setup
cp .env.example .env
docker compose up -d postgres redis
make migrate
make seed
make api
```

In another terminal:

```bash
make worker
make web
```

Health checks:

- API: `http://localhost:8000/health`
- Readiness: `http://localhost:8000/ready`
- Web: `http://localhost:3000`
