# Use official Python image as base
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY sentiment-analysis-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY sentiment-analysis-backend/. .

# Commented out since Render injects environment variables automatically
# COPY sentiment-analysis-backend/.env .

# Expose port (change if your app uses a different port)
EXPOSE 5000

# Run the backend
CMD ["python", "main.py"]
