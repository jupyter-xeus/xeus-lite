#!/bin/bash
set -e
pwd


ARG1=${1:-BUILD}
ARG2=${2:-2.0.32}

if [ $ARG1 = "BUILD" ]; then
    echo "BUILD: docker build:"
    docker build -f BuildWasmDockerfile -t test_xeus_wasm  --build-arg USER_ID=$(id -u) --build-arg EMSCRIPTEN_VER=$ARG2 .

    docker run --rm -v $(pwd):/xeus-lite    -u $(id -u):$(id -g)  test_xeus_wasm    /xeus-lite/test/copy_files.sh
else
    echo "SKIP BUILD:"
fi

echo "Import with Node"
node test/emscripten_wasm_test.js

which node
echo "Test with Node"
cd test
#node --no-experimental-fetch test_wasm.js

node --no-experimental-fetch emscripten_wasm_test.js
