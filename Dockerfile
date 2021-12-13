FROM node:14.18.1-alpine3.11

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn --ignore-scripts

COPY . .
RUN yarn && \ 
  yarn build

ENTRYPOINT ["yarn", "start"]
