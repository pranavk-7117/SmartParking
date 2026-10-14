@echo off
REM ParkIT - Docker Startup Script
REM This script disables Docker BuildKit (required for this Docker environment)
REM and starts all ParkIT containers.

set DOCKER_BUILDKIT=0
set COMPOSE_DOCKER_CLI_BUILD=0

echo Starting ParkIT containers...
docker compose up -d %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start containers. Check the output above.
    exit /b 1
)

echo.
echo ParkIT is starting up! Containers:
docker compose ps

echo.
echo Access the app at:
echo   Dashboard:  http://localhost:5173
echo   API Health: http://localhost:3000/api/v1/health
echo.
echo Default credentials (change in .env for production):
echo   Admin:    admin / change_me_admin_password
echo   Operator: operator / change_me_operator_password
