FROM node:14.16.1-alpine3.11

WORKDIR /app

COPY . .

RUN apk add --no-cache make gcc g++ python3 && \
  yarn && \
  yarn build && \
  apk del make gcc g++ python3

ENTRYPOINT ["yarn", "start"]
