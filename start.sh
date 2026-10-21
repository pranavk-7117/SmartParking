#!/usr/bin/env bash
# ParkIT - Docker Startup Script for Linux / macOS
set -e

# Detect available compose command (podman compose or docker compose)
if command -v podman-compose >/dev/null 2>&1; then
  COMPOSE_CMD="podman-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif podman compose version >/dev/null 2>&1; then
  COMPOSE_CMD="podman compose"
else
  echo "Error: Neither docker compose nor podman compose was found."
  exit 1
fi

echo "================================================="
echo "   Starting ParkIT Smart Parking Containers      "
echo "   Provider: $COMPOSE_CMD                        "
echo "================================================="

$COMPOSE_CMD up -d --build "$@"

echo ""
echo "Containers status:"
$COMPOSE_CMD ps

echo ""
echo "Access points:"
echo "  - Admin Dashboard:  http://localhost:5173"
echo "  - Backend Health:   http://localhost:3000/health"
echo "  - API via Proxy:    http://localhost:5173/api/v1/health"
echo ""
echo "Default Credentials:"
echo "  - Admin:    admin / change_me_admin_password"
echo "  - Operator: operator / change_me_operator_password"
echo "================================================="
