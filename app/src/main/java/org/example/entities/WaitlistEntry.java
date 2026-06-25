package org.example.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "waitlist")
@Getter @Setter @NoArgsConstructor
public class WaitlistEntry {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "train_id", nullable = false)
    private String trainId;

    @Column(name = "source")
    private String source;

    @Column(name = "destination")
    private String destination;

    @Column(name = "date_of_travel")
    private String dateOfTravel;

    /** ECONOMY | BUSINESS | FIRST */
    @Column(name = "fare_class")
    private String fareClass = "ECONOMY";

    @Column(name = "created_at")
    private String createdAt;

    /** WAITING | BOOKED | CANCELLED */
    @Column(name = "status")
    private String status = "WAITING";

    public WaitlistEntry(String id, String userId, String userName, String trainId,
                         String source, String destination, String dateOfTravel,
                         String fareClass, String createdAt) {
        this.id = id; this.userId = userId; this.userName = userName;
        this.trainId = trainId; this.source = source; this.destination = destination;
        this.dateOfTravel = dateOfTravel; this.fareClass = fareClass;
        this.createdAt = createdAt; this.status = "WAITING";
    }
}
