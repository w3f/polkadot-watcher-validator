#!/bin/bash
set -e

echo patching...
sed -i "/parity\/polkadot/c\      - image: parity\/polkadot:$latest_upstream " .circleci/config.yml
