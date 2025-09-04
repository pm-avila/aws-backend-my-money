# Use PostgreSQL 15 official image as base
FROM postgres:15

# Set environment variables for database configuration
# These act like default parameters in a Python class constructor
ENV POSTGRES_DB=myapp_db
ENV POSTGRES_USER=myapp_user
ENV POSTGRES_PASSWORD=myapp_password
ENV PGDATA=/var/lib/postgresql/data/pgdata

# Set locale for proper UTF-8 support
ENV LANG=en_US.utf8

# Create custom directory for initialization scripts
# Similar to having a dedicated __init__ method in Python
RUN mkdir -p /docker-entrypoint-initdb.d

# Copy initialization scripts (if any)
# These files will be executed in alphabetical order when container starts
# COPY init-scripts/ /docker-entrypoint-initdb.d/

# Install additional extensions or tools if needed
# Uncomment and modify as required
# RUN apt-get update && apt-get install -y \
#     postgresql-15-postgis-3 \
#     postgresql-15-postgis-3-scripts \
#     && rm -rf /var/lib/apt/lists/*

# Create directory for custom PostgreSQL configuration
RUN mkdir -p /etc/postgresql

# Note: The postgresql.conf file will be mounted as a volume
# This allows for easy configuration changes without rebuilding the image

# Create directory for logs with correct permissions
RUN mkdir -p /var/log/postgresql && \
    chown -R postgres:postgres /var/log/postgresql && \
    chmod 755 /var/log/postgresql

# Expose PostgreSQL port
EXPOSE 5432

# Create a health check
# Similar to implementing a __str__ method for debugging in Python
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Use the default entrypoint from postgres image
# This handles initialization and startup automatically
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command to start PostgreSQL
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]