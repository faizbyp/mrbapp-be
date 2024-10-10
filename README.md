# Roomeet BE

## Development

```bash
npm run server_dev
```

> If the app won't connect to the API, consider checking the `/index.js` file and check between server listen HTTP or HTTPS

## Deployment

1. Create Docker Image based on the environment.

- Development

```bash
docker buildx build --platform linux/arm64 -t faizbyp/mrbapp-be:x.x.x -f Dockerfile.dev --load .
```

- Production

```bash
docker buildx build --platform linux/arm64 -t faizbyp/mrbapp-be:x.x.x -f Dockerfile.prod --load .
```

> The difference between 2 command above is just the environment variable declared inside the `pm2` command flag

2. Test Locally

- Development

```bash
docker run -p 5000:5000 --env-file .env.development faizbyp/mrbapp-be:x.x.x
```

- Production

```bash
docker run -p 5000:5000 --env-file .env.production faizbyp/mrbapp-be:x.x.x
```

3. Push the image to Docker Hub.

4. Ask the infra team to update the deployment image based on the updated tag on Docker Hub.
