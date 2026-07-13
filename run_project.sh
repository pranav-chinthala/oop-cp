#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/oop"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"
LOCALSTACK_CONTAINER="oop-localstack"
DB_NAME="oop_rmcs"
DB_USER="oopapp"
DB_PASSWORD="oopapp123"
LOCALSTACK_ENDPOINT="http://localhost:4566"

mkdir -p "$LOG_DIR"

log() {
  printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

docker_exec() {
  if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
    docker "$@"
  else
    sudo docker "$@"
  fi
}

require_sudo() {
  if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    sudo -v
  fi
}

install_common_packages() {
  log "Installing common system packages"
  require_sudo
  sudo apt-get update
  sudo apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    lsb-release \
    software-properties-common \
    unzip
}

java_major_version() {
  if ! have_cmd java; then
    echo 0
    return
  fi

  local version_output
  version_output="$(java -version 2>&1 | awk -F '"' '/version/ {print $2; exit}')"
  if [[ -z "$version_output" ]]; then
    echo 0
    return
  fi

  if [[ "$version_output" == 1.* ]]; then
    echo "${version_output#1.}" | cut -d. -f1
  else
    echo "$version_output" | cut -d. -f1
  fi
}

install_java_23() {
  local current_major
  current_major="$(java_major_version)"
  if [[ "$current_major" =~ ^[0-9]+$ ]] && (( current_major >= 23 )); then
    log "Java $current_major detected"
    return
  fi

  log "Installing Java 23"
  require_sudo

  if sudo apt-get install -y openjdk-23-jdk; then
    return
  fi

  log "APT package openjdk-23-jdk was not available; installing Temurin 23 manually"
  local arch api_arch temp_dir
  arch="$(dpkg --print-architecture)"
  case "$arch" in
    amd64) api_arch="x64" ;;
    arm64) api_arch="aarch64" ;;
    *)
      log "Unsupported CPU architecture for automatic JDK download: $arch"
      exit 1
      ;;
  esac

  temp_dir="$(mktemp -d)"
  curl -fsSL "https://api.adoptium.net/v3/binary/latest/23/ga/linux/${api_arch}/jdk/hotspot/normal/eclipse" -o "$temp_dir/jdk23.tar.gz"
  sudo mkdir -p /opt/jdk-23
  sudo tar -xzf "$temp_dir/jdk23.tar.gz" -C /opt/jdk-23 --strip-components=1
  rm -rf "$temp_dir"

  export JAVA_HOME=/opt/jdk-23
  export PATH="$JAVA_HOME/bin:$PATH"
}

install_node() {
  local current_major
  current_major=0
  if have_cmd node; then
    current_major="$(node -p 'process.versions.node.split(".")[0]')"
  fi

  if [[ "$current_major" =~ ^[0-9]+$ ]] && (( current_major >= 20 )); then
    log "Node $current_major detected"
    return
  fi

  log "Installing Node.js 22"
  require_sudo
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
}

install_docker() {
  if have_cmd docker; then
    if docker_exec info >/dev/null 2>&1; then
      log "Docker is available"
      return
    fi
  fi

  log "Installing Docker"
  require_sudo
  sudo apt-get install -y docker.io
  sudo systemctl enable --now docker >/dev/null 2>&1 || sudo service docker start >/dev/null 2>&1 || true
}

install_mariadb() {
  log "Installing MariaDB"
  require_sudo
  sudo apt-get install -y mariadb-server mariadb-client
  sudo systemctl enable --now mariadb >/dev/null 2>&1 || sudo service mariadb start >/dev/null 2>&1 || sudo systemctl enable --now mysql >/dev/null 2>&1 || sudo service mysql start >/dev/null 2>&1 || true

  log "Waiting for MariaDB to accept connections"
  local attempts=0
  until sudo mysqladmin ping --silent >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if (( attempts > 60 )); then
      log "MariaDB did not become ready in time"
      exit 1
    fi
    sleep 1
  done

  log "Creating project database and user"
  sudo mysql --protocol=socket -e "
    CREATE DATABASE IF NOT EXISTS ${DB_NAME};
    CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
    FLUSH PRIVILEGES;
  "

  export SPRING_DATASOURCE_URL="jdbc:mysql://127.0.0.1:3306/${DB_NAME}?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
  export SPRING_DATASOURCE_USERNAME="$DB_USER"
  export SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD"
}

start_localstack() {
  if ! have_cmd docker || ! docker_exec info >/dev/null 2>&1; then
    log "Docker is not available, so LocalStack cannot be started automatically"
    return
  fi

  export APP_AWS_LOCALSTACK_ENDPOINT="$LOCALSTACK_ENDPOINT"

  if docker_exec ps -a --format '{{.Names}}' | grep -qx "$LOCALSTACK_CONTAINER"; then
    log "Starting existing LocalStack container"
    docker_exec start "$LOCALSTACK_CONTAINER" >/dev/null
  else
    log "Starting LocalStack container"
    docker_exec run -d \
      --name "$LOCALSTACK_CONTAINER" \
      -p 4566:4566 \
      -p 4510-4559:4510-4559 \
      -e SERVICES=s3,dynamodb \
      -e DEBUG=0 \
      localstack/localstack:latest >/dev/null
  fi

  log "Waiting for LocalStack"
  local attempts=0
  until curl -fsS "$LOCALSTACK_ENDPOINT/_localstack/health" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if (( attempts > 90 )); then
      log "LocalStack did not become ready in time"
      exit 1
    fi
    sleep 1
  done
}

install_frontend_dependencies() {
  log "Installing frontend dependencies"
  pushd "$FRONTEND_DIR" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
  popd >/dev/null
}

start_backend() {
  log "Starting backend"
  pushd "$BACKEND_DIR" >/dev/null
  nohup ./gradlew --no-daemon bootRun >"$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!
  popd >/dev/null
}

start_frontend() {
  log "Starting frontend"
  pushd "$FRONTEND_DIR" >/dev/null
  nohup npm run dev -- --host 0.0.0.0 >"$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  popd >/dev/null
}

cleanup() {
  local exit_code=$?
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if have_cmd docker && docker_exec ps -a --format '{{.Names}}' | grep -qx "$LOCALSTACK_CONTAINER"; then
    docker_exec stop "$LOCALSTACK_CONTAINER" >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

install_common_packages
install_java_23
install_node
install_docker
install_mariadb
start_localstack
install_frontend_dependencies
start_backend
start_frontend

log "Backend logs: $LOG_DIR/backend.log"
log "Frontend logs: $LOG_DIR/frontend.log"
log "Frontend: http://localhost:5173"
log "Backend: http://localhost:8081"
log "LocalStack: $LOCALSTACK_ENDPOINT"

while true; do
  if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    log "Backend stopped. Check $LOG_DIR/backend.log"
    exit 1
  fi

  if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    log "Frontend stopped. Check $LOG_DIR/frontend.log"
    exit 1
  fi

  sleep 2
done