FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ app/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Run the FastAPI application
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
