[![CircleCI](https://circleci.com/gh/w3f/polkadot-watcher-validator.svg?style=svg)](https://circleci.com/gh/w3f/polkadot-watcher-validator)

# polkadot-watcher-validator

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
It can then monitor the status of the node, leveraging on mechanisms such as the builtin heartbeat.

### Monitoring Features

- A validator has been reported for Slash
- A validator is not seleceted by Phragmen alorithm to be part of the active set
- A validator has changed his payout address destination
- A validator has an unexpected payout address destination
- A validator has changed his commission rate
- A validator has an unexpected commission rate

#### Unexpected payout address destination

Possible Payout Destination Types are `'Staked' | 'Stash' | 'Controller' | 'Account' | 'None'`.  
If an expected destination address is specified in the config file, it is implicit that you are expecting a type `'Account'` to be matched.

### Resources

- session: https://wiki.polkadot.network/docs/en/glossary#session
- era: https://wiki.polkadot.network/docs/en/glossary#era
- polkadotJs library (raccomended, Nodejs + typescript): https://polkadot.js.org/docs/
- event, validator SlashReported: https://polkadot.js.org/docs/substrate/events/#slashreportedaccountid32-perbill-u32

## Configuration

A sample config file is provided [here](config/main.sample.yaml)

### Validators from Git

The list of your addresses can be dynamically retrieved (app startup/restart) from a Git file. Check the [GitConfigLoader](src/gitConfigLoader) implementation.  

- [GitLab API](https://docs.gitlab.com/ee/api/repository_files.html)

### Prometheus

A Prometheus instance can be attached to this application thanks to the endpoint exposed at [/metrics](https://github.com/w3f/polkadot-watcher-validator/blob/master/src/prometheus.ts#L114).  
An Alerting system can be then built on top of that, see [here](charts/polkadot-watcher/templates/alertrules.yaml)

## Deployment 

The [Dockerfile](Dockerfile) can be deployed into a Kubernetes cluster thanks to the polkadot-watcher [chart](charts/polkadot-watcher).


