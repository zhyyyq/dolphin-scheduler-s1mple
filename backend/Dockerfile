FROM openjdk:8-jre-slim
WORKDIR /app
COPY ./target/scheduler-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
