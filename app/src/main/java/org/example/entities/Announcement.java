package org.example.entities;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "announcements")
@Getter @Setter @NoArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class Announcement {
    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    /** INFO | WARNING | ALERT */
    @Column(name = "type", nullable = false)
    private String type = "INFO";

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at")
    private String createdAt;

    public Announcement(String id, String message, String type, String createdAt) {
        this.id = id; this.message = message;
        this.type = type; this.active = true; this.createdAt = createdAt;
    }
}
