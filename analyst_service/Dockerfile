# Use the official Python image
FROM python:3.11-slim

# Install uv via pip
RUN pip install --no-cache-dir uv

# Set working directory
WORKDIR /app

# Copy project configuration files
COPY pyproject.toml .

# Install dependencies using uv
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy application entrypoints and packages
COPY main.py .
COPY agent.py .
COPY app/ app/

# Expose default Cloud Run port
EXPOSE 8080

# Run FastAPI app with Uvicorn
CMD ["python", "main.py"]
