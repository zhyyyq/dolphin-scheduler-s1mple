FROM ghcr.io/apache/dolphinscheduler/dolphinscheduler-worker:latest

# install python

RUN apt update && apt install python3 -y
RUN ln -s /usr/bin/python3 /usr/bin/python

# allow default tenant
# allow python gateway
COPY application.yaml /opt/dolphinscheduler/conf


# java libs for database like db2 mysql hive
COPY ./jars/*.jar /opt/dolphinscheduler/libs/
