FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN addgroup --system crawler \
    && adduser --system --ingroup crawler crawler

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=crawler:crawler src ./src

USER crawler
EXPOSE 8000

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
