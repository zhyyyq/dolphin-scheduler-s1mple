FROM apache/dolphinscheduler-master:3.4.1

# copy plugin_config
COPY ./plugins_config /opt/dolphinscheduler/conf/
# install plugins
RUN /opt/dolphinscheduler/bin/install-plugins.sh