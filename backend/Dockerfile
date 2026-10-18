# syntax=docker/dockerfile:1
# Backend image: built with the Maven wrapper, run on a JRE as a non-root user.
# Tests run in CI before this build, so they are skipped here.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
# A Windows checkout (core.autocrlf) gives mvnw CRLF line endings, which sh cannot run.
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q -DskipTests package \
    && cp target/edu-game-backend-*.jar /app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 app \
    && mkdir -p /data/assets && chown -R app /data
USER app
WORKDIR /app
COPY --from=build /app.jar app.jar
# Uploaded images; docker-compose mounts a volume here.
ENV ASSET_DIR=/data/assets
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
