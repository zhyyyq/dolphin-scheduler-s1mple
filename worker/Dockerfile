FROM apache/dolphinscheduler-worker:3.2.2

# install python 3.13

COPY Python-3.13.5.tgz /

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
    tar -xvf /Python-3.13.5.tgz -C / && \
    cd /Python-3.13.5 && \
    ./configure --enable-optimizations --with-ensurepip=install && \
    make -j"$(nproc)" && \
    make install && \
    cd / && \
    rm -rf /Python-3.13.5.tgz /Python-3.13.5 && \
    apt-get purge -y --auto-remove build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/local/bin/python3 /usr/bin/python

# allow default tenant
# allow python gateway
COPY application.yaml /opt/dolphinscheduler/conf

# copy libs
COPY ./libs/*.jar /opt/dolphinscheduler/libs/
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --index-url https://pypi.tuna.tsinghua.edu.cn/simple --extra-index-url https://download.pytorch.org/whl/cpu
