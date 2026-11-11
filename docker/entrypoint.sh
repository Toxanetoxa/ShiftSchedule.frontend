#!/bin/sh
set -eu

cd /app

npm ci --no-audit --no-fund

exec "$@"
