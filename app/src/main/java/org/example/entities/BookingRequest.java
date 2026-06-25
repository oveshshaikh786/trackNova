package org.example.entities;

import java.util.List;

public class BookingRequest {
    private String userId;
    private String trainId;
    private int    row;
    private int    col;
    private String source;
    private String destination;
    private String dateOfTravel;
    private String promoCode;

    // Multi-seat: list of {row, col} pairs — if set, overrides single row/col
    private List<int[]> seats;

    // Round-trip fields
    private String returnTrainId;
    private String returnDate;
    private int    returnRow;
    private int    returnCol;
    private List<int[]> returnSeats;

    public BookingRequest() {}

    public String       getUserId()        { return userId; }
    public String       getTrainId()       { return trainId; }
    public int          getRow()           { return row; }
    public int          getCol()           { return col; }
    public String       getSource()        { return source; }
    public String       getDestination()   { return destination; }
    public String       getDateOfTravel()  { return dateOfTravel; }
    public String       getPromoCode()     { return promoCode; }
    public List<int[]>  getSeats()         { return seats; }
    public String       getReturnTrainId() { return returnTrainId; }
    public String       getReturnDate()    { return returnDate; }
    public int          getReturnRow()     { return returnRow; }
    public int          getReturnCol()     { return returnCol; }
    public List<int[]>  getReturnSeats()   { return returnSeats; }

    public void setUserId(String v)            { this.userId = v; }
    public void setTrainId(String v)           { this.trainId = v; }
    public void setRow(int v)                  { this.row = v; }
    public void setCol(int v)                  { this.col = v; }
    public void setSource(String v)            { this.source = v; }
    public void setDestination(String v)       { this.destination = v; }
    public void setDateOfTravel(String v)      { this.dateOfTravel = v; }
    public void setPromoCode(String v)         { this.promoCode = v; }
    public void setSeats(List<int[]> v)        { this.seats = v; }
    public void setReturnTrainId(String v)     { this.returnTrainId = v; }
    public void setReturnDate(String v)        { this.returnDate = v; }
    public void setReturnRow(int v)            { this.returnRow = v; }
    public void setReturnCol(int v)            { this.returnCol = v; }
    public void setReturnSeats(List<int[]> v)  { this.returnSeats = v; }

    /** Returns the list of seats to book — normalises single row/col into a list */
    public List<int[]> resolvedSeats() {
        if (seats != null && !seats.isEmpty()) return seats;
        return List.of(new int[]{row, col});
    }

    public boolean isRoundTrip() {
        return returnTrainId != null && !returnTrainId.isBlank() && returnDate != null && !returnDate.isBlank();
    }
}
