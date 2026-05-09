# Stage 1: Build Python
FROM apache/dolphinscheduler-worker:3.4.1 AS builder

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    zlib1g-dev \
    libncurses5-dev \
    libgdbm-dev \
    libnss3-dev \
    libssl-dev \
    libreadline-dev \
    libffi-dev \
    libsqlite3-dev \
    libbz2-dev \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

# Copy and build Python
COPY Python-3.13.5.tgz /
RUN tar -xvf /Python-3.13.5.tgz -C / && \
    cd /Python-3.13.5 && \
    ./configure --enable-optimizations --with-ensurepip=install && \
    make -j"$(nproc)" && \
    make install

# Stage 2: Final image
FROM apache/dolphinscheduler-worker:3.4.1

# Copy Python from the builder stage
COPY --from=builder /usr/local/ /usr/local/

# Create symlink
RUN ln -s /usr/local/bin/python3 /usr/bin/python

# copy plugin_config
COPY ./plugins_config /opt/dolphinscheduler/conf/
# install plugins
RUN /opt/dolphinscheduler/bin/install-plugins.sh

# drop default libs
RUN rm -rf /opt/dolphinscheduler/api-server/libs/hive-*.jar
RUN rm -rf /opt/dolphinscheduler/worker-server/libs/hive-*.jar
# copy libs worker-server/libs api-server/libs
COPY ./libs/*.jar /opt/dolphinscheduler/api-server/libs/
COPY ./libs/*.jar /opt/dolphinscheduler/worker-server/libs/

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

