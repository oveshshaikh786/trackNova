package org.example.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class Ticket {

    @Id
    @Column(name = "ticket_id")
    private String ticketId;

    /** The owner — not serialized in JSON responses to avoid recursion */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    /** userId exposed as JSON field for the frontend */
    @Column(name = "user_id", insertable = false, updatable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "train_id")
    private Train train;

    @Column(name = "source")
    private String source;

    @Column(name = "destination")
    private String destination;

    @Column(name = "date_of_travel")
    private String dateOfTravel;

    @Column(name = "seat_row")
    private int seatRow;

    @Column(name = "seat_col")
    private int seatCol;

    /** ECONOMY | BUSINESS | FIRST */
    @Column(name = "fare_class")
    private String fareClass = "ECONOMY";

    /** Actual price paid (after promo discount).
     *  Integer (nullable) so old DB rows with NULL don't throw NPE on load. */
    @Column(name = "price_paid", nullable = true)
    private Integer pricePaid;

    /** Passenger display name (snapshot from profile at booking time) */
    @Column(name = "passenger_name")
    private String passengerName;

    /** OUTBOUND | RETURN — for round-trip pairs */
    @Column(name = "trip_type")
    private String tripType = "OUTBOUND";

    /** Links the two legs of a round trip */
    @Column(name = "trip_pair_id")
    private String tripPairId;

    public Ticket(String ticketId, User user, Train train,
                  String source, String destination, String dateOfTravel,
                  int seatRow, int seatCol) {
        this.ticketId = ticketId;
        this.user = user;
        this.userId = user.getUserId();
        this.train = train;
        this.source = source;
        this.destination = destination;
        this.dateOfTravel = dateOfTravel;
        this.seatRow = seatRow;
        this.seatCol = seatCol;
        this.fareClass = Train.getFareClassForRow(seatRow);
        this.passengerName = (user.getFirstName() != null ? user.getFirstName() + " " : "") +
                             (user.getLastName()  != null ? user.getLastName()  : "");
        if (this.passengerName.isBlank()) this.passengerName = user.getName();
    }

    @Override
    public String toString() {
        return "Ticket ID: " + ticketId + " | " + source + " → " + destination +
               " | Date: " + dateOfTravel + " | Train: " + (train != null ? train.getTrainInfo() : "N/A");
    }
}
