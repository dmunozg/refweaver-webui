FROM docker.io/oven/bun:1.3.10

# Install PostgreSQL client for database bootstrap scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Verify psql is available at build time
RUN psql --version
