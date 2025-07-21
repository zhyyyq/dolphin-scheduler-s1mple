# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install uv
RUN pip install uv

# Copy the requirements file into the container at /app
COPY . /app/

# Install any needed packages specified in requirements.txt
RUN uv sync

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run uvicorn when the container launches
CMD ["uv", "run", "uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
