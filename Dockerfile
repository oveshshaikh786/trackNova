# Build Stage — use JDK image so gradlew runs as root (no permission issues)
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /home/app
COPY . .
ARG CACHEBUST=2
RUN chmod +x gradlew && \
    ./gradlew :app:bootJar --no-daemon --no-configuration-cache -x test && \
    echo "=== JAR FILES ===" && ls -la app/build/libs/ && \
    echo "=== org/example classes in jar ===" && \
    jar tf app/build/libs/app-0.0.1-SNAPSHOT.jar | grep "org/example" || echo "MISSING"

# Run Stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /home/app/app/build/libs/app-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
