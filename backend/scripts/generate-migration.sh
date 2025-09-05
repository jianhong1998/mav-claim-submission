#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <filename>"
  echo "Example: $0 create-users-table"
  exit 1
fi

filename="$1"

pnpm run build
pnpm run typeorm migration:generate -p "src/db/migrations/${filename}"
pnpm run format