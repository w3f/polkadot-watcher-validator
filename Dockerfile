FROM node:14-alpine as build

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node yarn.lock yarn.lock
COPY --chown=node:node package.json package.json
RUN yarn --ignore-scripts

COPY --chown=node:node . .

RUN yarn build && \
    yarn --prod

FROM node:14-alpine

WORKDIR /app
RUN chown node:node /app

COPY --from=build --chown=node:node /app/dist /app
COPY --from=build --chown=node:node /app/node_modules /app/node_modules

USER node

ENV NODE_OPTIONS --enable-source-maps

ENTRYPOINT [ "node", "index.js", "start" ]
