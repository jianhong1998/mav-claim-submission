#!/bin/bash

pnpm run build
pnpm run typeorm migration:revert