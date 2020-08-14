#!/bin/bash

set -euo pipefail
set -x

TEST_FOLDER="test/prometheus"
CHART_NAME="polkadot-watcher"
for file in $(find "${TEST_FOLDER}" -name *yaml | sed 's|^'"${TEST_FOLDER}"/'||'); do
    template_name=${file##*/}

    helm template --set monitoring=true -s "templates/${template_name}" "charts/${CHART_NAME}" | yq r - spec | promtool check rules /dev/stdin
    helm template --set monitoring=true -s "templates/${template_name}" "charts/${CHART_NAME}" | yq r - spec | promtool test rules "${TEST_FOLDER}/${template_name}"
done