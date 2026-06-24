# Build Stage
FROM gradle:8.7.0-jdk17 AS builder
WORKDIR /home/app
COPY . .
RUN gradle -p app bootJar --no-daemon -x test

# Run Stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /home/app/app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]