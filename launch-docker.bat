@echo off
setlocal

set "CONTAINER_NAME=qotd-deck-bot"

rem Windows fails to set paths correctly with COMPOSE_BAKE
set "COMPOSE_BAKE=false"

rem Check if the container is running
for /f %%i in ('docker ps -q -f name=%CONTAINER_NAME%') do set "CID=%%i"
if not defined CID (
    echo Container %CONTAINER_NAME% is not running. Skipping log saving.
) else (
    rem Create a dated log file name
    for /f "tokens=1-3 delims=/- " %%a in ("%date%") do (
        set "YYYY=%%c"
        set "MM=%%a"
        set "DD=%%b"
    )
    for /f "tokens=1-3 delims=:." %%a in ("%time%") do (
        set "HH=%%a"
        set "NN=%%b"
        set "SS=%%c"
    )
    set "LOG_FILE=logs\%CONTAINER_NAME%_%YYYY%-%MM%-%DD%_%HH%-%NN%-%SS%.log"

    if not exist logs mkdir logs
    docker logs %CONTAINER_NAME% > "%LOG_FILE%"

    if "%ERRORLEVEL%"=="0" (
        echo Logs saved to %LOG_FILE%
    ) else (
        echo Failed to save logs
        exit /b 1
    )
)

rem Fetch the latest changes from the remote repository
git fetch

rem Merge the fetched changes with a custom commit message
git merge --no-ff -m "Merged changes from remote repository."

docker-compose down

docker-compose up -d --build

docker image prune -f

echo Attaching to container %CONTAINER_NAME%... (CTRL+p CTRL+q to detach)

docker logs -f %CONTAINER_NAME%