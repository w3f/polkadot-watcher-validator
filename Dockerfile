FROM node:12.18.4-alpine

WORKDIR /app

COPY . .

RUN apk add --no-cache make gcc g++ python3 && \
  yarn && \
  yarn build && \
  apk del make gcc g++ python3

ENTRYPOINT ["yarn", "start"]
