#!/bin/sh
set -eu

: "${DATABASE_USER:?DATABASE_USER is required in be/.env}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required in be/.env}"
: "${DATABASE_NAME:?DATABASE_NAME is required in be/.env}"

export POSTGRES_USER="$DATABASE_USER"
export POSTGRES_PASSWORD="$DATABASE_PASSWORD"
export POSTGRES_DB="$DATABASE_NAME"

exec docker-entrypoint.sh postgres
