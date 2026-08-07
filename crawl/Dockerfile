FROM python:3.12-slim

WORKDIR /app

# curl_cffi needs recent libcurl; playwright browsers need system libs
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libcurl4-openssl-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Chromium system deps are reused by Camoufox's Firefox (Indeed + Cloudflare
# fallbacks). The chromium binary itself is unused (slim image can stash it);
# `--with-deps` is what guarantees the GUI/GL libraries both browsers need.
RUN playwright install --with-deps chromium || true

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
