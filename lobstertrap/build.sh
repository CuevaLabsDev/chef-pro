#!/usr/bin/env bash
set -e

echo "Building Lobster Trap from source..."
git clone https://github.com/veeainc/lobstertrap.git /tmp/lobstertrap-src
cd /tmp/lobstertrap-src && make build
cp /tmp/lobstertrap-src/lobstertrap "$(dirname "$0")/lobstertrap-bin"
echo "Lobster Trap binary ready at lobstertrap/lobstertrap-bin"
