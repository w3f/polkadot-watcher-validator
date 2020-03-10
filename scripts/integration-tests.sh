#!/bin/bash

source /scripts/common.sh
source /scripts/bootstrap-helm.sh


run_tests() {
    echo Running tests...

    wait_pod_ready polkadot-watcher
}

teardown() {
    helm delete polkadot-watcher
}

main(){
    if [ -z "$KEEP_W3F_POLKADOT_WATCHER" ]; then
        trap teardown EXIT
    fi

    /scripts/build-helm.sh \
        --set environment=ci \
        --set image.tag="${CIRCLE_SHA1}" \
        polkadot-watcher \
        ./charts/polkadot-watcher

    run_tests
}

main
