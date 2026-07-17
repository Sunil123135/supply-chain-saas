FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY workflows_catalog.py worker.py gateway.py schedules.py worker_stub.py ./

ENV PYTHONUNBUFFERED=1
ENV TEMPORAL_HOST=temporal:7233
ENV TEMPORAL_NAMESPACE=default
ENV TEMPORAL_TASK_QUEUE=yugam-autonomy
ENV TEMPORAL_GATEWAY_PORT=8090

EXPOSE 8090

CMD ["python", "worker.py"]
