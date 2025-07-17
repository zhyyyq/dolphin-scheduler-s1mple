FROM ghcr.io/apache/dolphinscheduler/dolphinscheduler-worker:latest

# install python

RUN apt update && apt install python3 -y
RUN ln -s /usr/bin/python3 /usr/bin/python

# allow default tenant
# allow python gateway
COPY application.yaml /opt/dolphinscheduler/conf

# copy libs
COPY ./libs/*.jar /opt/dolphinscheduler/libs/