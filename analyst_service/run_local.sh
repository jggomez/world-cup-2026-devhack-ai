#!/bin/bash
# Exit on error
set -e

# Change directory to the script folder
cd "$(dirname "$0")"

# Load environment variables from .env if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  export $(grep -v '^#' .env | xargs)
else
  echo "Warning: .env file not found. Copying .env.example to .env..."
  cp .env.example .env
  echo "Created .env. Please configure GOOGLE_CLOUD_PROJECT if needed."
fi

echo "Starting World Cup AI Analyst Microservice locally..."
echo "Project: $GOOGLE_CLOUD_PROJECT"
echo "Location: $GOOGLE_CLOUD_LOCATION"

# Run the FastAPI server using uv
uv run uvicorn main:app --reload --host 0.0.0.0 --port ${PORT:-8000}
