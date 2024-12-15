#!/usr/bin/env bash
# Use this script to start a podman container for a local development database

DB_CONTAINER_NAME="optinurse-postgres"

if ! [ -x "$(command -v podman)" ]; then
  echo -e "Podman is not installed. Please install podman and try again.\Podman install guide: https://podman.io/docs/installation"
  exit 1
fi

if [ "$(podman ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  echo "Database container '$DB_CONTAINER_NAME' already running"
  exit 0
fi

if [ "$(podman ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
  podman start "$DB_CONTAINER_NAME"
  echo "Existing database container '$DB_CONTAINER_NAME' started"
  exit 0
fi

# import env variables from .env
set -a
source .env

podman run -d \
  --name $DB_CONTAINER_NAME \
  -e POSTGRES_USER="$DATABASE_USER" \
  -e POSTGRES_PASSWORD="$DATABASE_PASSWORD" \
  -e POSTGRES_DB="postgres" \
  -p 5432:5432 \
  docker.io/postgis/postgis:17-3.5 && echo "Database container '$DB_CONTAINER_NAME' was successfully created"
