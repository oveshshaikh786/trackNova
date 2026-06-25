package org.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Application entry point — starts the Spring Boot REST API on port 8080.
 *
 * Run with:  ./gradlew bootRun
 *
 * On first boot, DataSeeder will create the 5 Amtrak trains and an admin user
 * (username: admin, password: admin123) if the tables are empty.
 *
 * Requires PostgreSQL running locally:
 *   docker run -e POSTGRES_DB=irctc -e POSTGRES_USER=postgres \
 *              -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
 * OR configure application.properties with your own DB credentials.
 */
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
