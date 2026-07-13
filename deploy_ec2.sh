#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
    return
  fi

  log "Docker Compose is not available"
  exit 1
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && (docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1); then
    return
  fi

  log "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo systemctl enable --now docker >/dev/null 2>&1 || sudo service docker start >/dev/null 2>&1 || true

  if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
    log "Docker is installed, but Compose is still unavailable"
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts=0

  until curl -fsS "$url" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if (( attempts > 120 )); then
      log "$label did not become ready in time"
      exit 1
    fi
    sleep 2
  done
}

wait_for_backend() {
  local attempts=0

  until curl -fsS -H 'Content-Type: application/json' \
    -d '{"service":"LOCALSTACK","action":"STATUS"}' \
    http://localhost:8081/api/emulator/aws >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if (( attempts > 120 )); then
      log "Backend did not become ready in time"
      exit 1
    fi
    sleep 2
  done
}

ensure_docker

log "Starting the full stack"
compose_cmd up -d --build

log "Waiting for LocalStack"
wait_for_http "http://localhost:4566/_localstack/health" "LocalStack"

log "Waiting for backend"
wait_for_backend

log "Bootstrapping LocalStack resources"
curl -fsS -H 'Content-Type: application/json' \
  -d '{"service":"LOCALSTACK","action":"BOOTSTRAP"}' \
  http://localhost:8081/api/emulator/aws >/dev/null

log "Waiting for frontend"
wait_for_http "http://localhost:5173" "Frontend"

log "Deployment complete"
compose_cmd ps
printf '\nFrontend: http://<ec2-public-ip>:5173\nBackend: http://<ec2-public-ip>:8081\nLocalStack: http://<ec2-public-ip>:4566\n'