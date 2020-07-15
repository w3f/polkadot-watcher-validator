#!/bin/bash
set -e


patch(){
  local BRANCH=$1
  local LATEST_UPSTREAM=$2
  local GITHUB_BOT_TOKEN=$3

  local build_dir=$(mktemp -d)
  local target_repo="https://web3bot:${GITHUB_BOT_TOKEN}@github.com/w3f/polkadot-watcher"

  cd $build_dir
  git clone "${target_repo}" .
  git checkout -b "${BRANCH}"

  sed -i "/parity\/polkadot/c\      - image: parity\/polkadot:$LATEST_UPSTREAM " .circleci/config.yml


}
