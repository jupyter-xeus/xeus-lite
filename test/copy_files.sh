#!/bin/bash
set -e
cd /xeus-build/test
cp *.{js,wasm} /xeus-lite/test
cp /install/lib/libxeus.so /xeus-lite/test
