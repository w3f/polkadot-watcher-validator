#!/bin/sh

/scripts/deploy.sh -t helm -c engineering \
                   --set image.tag="${CIRCLE_TAG}" \
                   polkadot-watcher \
                   w3f/polkadot-watcher
