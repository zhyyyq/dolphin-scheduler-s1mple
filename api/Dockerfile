FROM apache/dolphinscheduler-api:3.4.1

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
