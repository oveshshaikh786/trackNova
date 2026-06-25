package org.example.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.*;
import org.example.converters.SeatsConverter;
import org.example.converters.StationTimesConverter;
import org.example.converters.StationsConverter;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "trains")
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class Train {

    @Id
    @Column(name = "train_id")
    private String trainId;

    @Column(name = "train_no")
    private String trainNo;

    @Column(name = "name")
    private String name;

    @Column(name = "price_per_seat")
    private int pricePerSeat;

    @Convert(converter = SeatsConverter.class)
    @Column(name = "seats", columnDefinition = "TEXT")
    private List<List<Integer>> seats;

    @Convert(converter = StationTimesConverter.class)
    @Column(name = "station_times", columnDefinition = "TEXT")
    private Map<String, String> stationTimes;

    @Convert(converter = StationsConverter.class)
    @Column(name = "stations", columnDefinition = "TEXT")
    private List<String> stations;

    /** ON_TIME | DELAYED | CANCELLED */
    @Column(name = "status", nullable = false)
    private String status = "ON_TIME";

    @Column(name = "delay_minutes")
    private int delayMinutes = 0;

    @Column(name = "status_reason")
    private String statusReason;

    // ── Fare classes (rows 0-5=Economy, 6-8=Business, 9=First) ─────────
    // Use Integer (nullable) so old DB rows with NULL don't throw on load
    @Column(name = "price_economy", nullable = true)
    private Integer priceEconomy;

    @Column(name = "price_business", nullable = true)
    private Integer priceBusiness;

    @Column(name = "price_first", nullable = true)
    private Integer priceFirst;

    public Train() {}

    public Train(String trainId, String trainNo, String name, int pricePerSeat,
                 List<List<Integer>> seats, Map<String, String> stationTimes, List<String> stations) {
        this.trainId = trainId; this.trainNo = trainNo; this.name = name;
        this.pricePerSeat = pricePerSeat; this.seats = seats;
        this.stationTimes = stationTimes; this.stations = stations;
        this.status = "ON_TIME"; this.delayMinutes = 0;
        // default fare class prices derived from base price
        this.priceEconomy  = pricePerSeat;
        this.priceBusiness = (int) Math.round(pricePerSeat * 1.8);
        this.priceFirst    = (int) Math.round(pricePerSeat * 3.0);
    }

    public String getTrainId()                          { return trainId; }
    public String getTrainNo()                          { return trainNo; }
    public String getName()                             { return name; }
    public int    getPricePerSeat()                     { return pricePerSeat; }
    public List<List<Integer>> getSeats()               { return seats; }
    public Map<String, String> getStationTimes()        { return stationTimes; }
    public List<String> getStations()                   { return stations; }
    public String getStatus()                           { return status; }
    public int    getDelayMinutes()                     { return delayMinutes; }
    public String getStatusReason()                     { return statusReason; }
    public int    getPriceEconomy()  { return (priceEconomy  != null && priceEconomy  > 0) ? priceEconomy  : pricePerSeat; }
    public int    getPriceBusiness() { return (priceBusiness != null && priceBusiness > 0) ? priceBusiness : (int) Math.round(pricePerSeat * 1.8); }
    public int    getPriceFirst()    { return (priceFirst    != null && priceFirst    > 0) ? priceFirst    : (int) Math.round(pricePerSeat * 3.0); }

    public void setTrainId(String v)                    { this.trainId = v; }
    public void setTrainNo(String v)                    { this.trainNo = v; }
    public void setName(String v)                       { this.name = v; }
    public void setPricePerSeat(int v)                  { this.pricePerSeat = v; }
    public void setSeats(List<List<Integer>> v)         { this.seats = v; }
    public void setStationTimes(Map<String, String> v)  { this.stationTimes = v; }
    public void setStations(List<String> v)             { this.stations = v; }
    public void setStatus(String v)                     { this.status = v; }
    public void setDelayMinutes(int v)                  { this.delayMinutes = v; }
    public void setStatusReason(String v)               { this.statusReason = v; }
    public void setPriceEconomy(int v)                  { this.priceEconomy = v; }
    public void setPriceBusiness(int v)                 { this.priceBusiness = v; }
    public void setPriceFirst(int v)                    { this.priceFirst = v; }

    /** Returns price for a given row based on fare class zones */
    public int getPriceForRow(int row) {
        if (row >= 9) return getPriceFirst();
        if (row >= 6) return getPriceBusiness();
        return getPriceEconomy();
    }

    /** Returns fare class label for a given row */
    public static String getFareClassForRow(int row) {
        if (row >= 9) return "FIRST";
        if (row >= 6) return "BUSINESS";
        return "ECONOMY";
    }

    public String getTrainInfo() {
        return String.format("Train ID: %s | %s | Train No: %s", trainId, name, trainNo);
    }
}
