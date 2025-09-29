#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"

make -j10

DEBUG=client ./node $SCRIPT_DIR/index.js
