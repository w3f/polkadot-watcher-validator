[![CircleCI](https://circleci.com/gh/w3f/polkadot-watcher-validator.svg?style=svg)](https://circleci.com/gh/w3f/polkadot-watcher-validator)

# polkadot-watcher

## How to Run 

### Requirements
- yarn: https://classic.yarnpkg.com/en/docs/install/

```bash
git clone https://github.com/w3f/polkadot-watcher.git
cd polkadot-watcher
cp config/main.sample.yaml config/main.yaml 
#just the first time

yarn
yarn build
yarn start
```

## About

The watcher is a nodeJs application meant to be connected with a substrate based node through a web socket.  
It can then monitor the readiness status of the node, leveraging on mechanisms such as the builtin heartbeat.

### Resources

- validators staking and heartbeats: https://wiki.polkadot.network/docs/en/learn-staking#unresponsiveness
- session: https://wiki.polkadot.network/docs/en/glossary#session
- era: https://wiki.polkadot.network/docs/en/glossary#era
- polkadotJs library (raccomended, Nodejs + typescript): https://polkadot.js.org/docs/
- event, validators offline: https://polkadot.js.org/docs/substrate/events#someofflinevecidentificationtuple

## Configuration

A sample config file is provided [here](config/main.sample.yaml)

### Prometheus

A Prometheus instance can be attached to this application thanks to the endpoint exposed at /metrics.  
An Alerting system can be then built on top of that, see [here](charts/polkadot-watcher/templates/alertrules.yaml)

## Deployment 

The [Dockerfile](Dockerfile) can be deployed into a Kubernetes cluster thanks to the polkadot-watcher [chart](charts/polkadot-watcher).


