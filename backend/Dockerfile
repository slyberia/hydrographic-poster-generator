# Pinned to an explicit Debian release: the floating `-slim` tag re-points to
# each new Debian stable, silently changing apt package availability, library
# versions, and font rendering/text metrics under us. Bump deliberately.
FROM python:3.11-slim-bookworm

# CairoSVG system dependencies (docs/PROJECTION_SCALEBAR_NOTES.md §11.3)
# plus fontconfig for font registration/inspection.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libgdk-pixbuf-2.0-0 \
        libffi-dev \
        shared-mime-info \
        fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Poster typography faces (Inter, Roboto Mono, Outfit) as system fonts.
# CairoSVG ignores the SVG's Google-Fonts @import; without these installed,
# exported text silently falls back and text metrics are wrong (§11.3).
COPY fonts/*.ttf /usr/local/share/fonts/hydro/
RUN fc-cache -f

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080

# DATABASE_URL is read from the environment at startup (app/settings.py).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
