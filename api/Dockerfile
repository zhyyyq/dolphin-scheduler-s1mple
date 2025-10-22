FROM apache/dolphinscheduler-api:3.3.1

# drop default libs
RUN rm -rf /opt/dolphinscheduler/libs/commons-text-*.jar
RUN rm -rf /opt/dolphinscheduler/libs/hive-*.jar
# copy libs
COPY ./libs/*.jar /opt/dolphinscheduler/libs/