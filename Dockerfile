FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install -g pm2


COPY . .

EXPOSE 5000
EXPOSE 80
EXPOSE 443

CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]