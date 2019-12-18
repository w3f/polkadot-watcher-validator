#!/bin/sh

/scripts/deploy.sh -t helm -c engineering \
                   -a "--set image.tag=${CIRCLE_TAG} polkadot-watcher w3f/polkadot-watcher"
