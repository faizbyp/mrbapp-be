# Roomeet BE

## Development

```bash
npm run server_dev
```

## Deployment

Create Docker Image based on the environment.

**Development**

```bash
docker buildx build --platform linux/arm64 -t faizbyp/mrbapp-be:x.x.x -f Dockerfile.dev --load .
```

**Production**

```bash
docker buildx build --platform linux/arm64 -t faizbyp/mrbapp-be:x.x.x -f Dockerfile.prod --load .
```

> The difference between 2 command above is just the environment variable declared inside the `pm2` command flag
