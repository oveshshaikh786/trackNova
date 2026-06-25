package org.example.entities;

/**
 * A single landmark waypoint along a train route.
 * positionPercent = 0 (departure) → 100 (arrival).
 */
public class Waypoint {

    private String trainId;
    private int    positionPercent; // 0-100
    private String name;            // short landmark name
    private String narration;       // 1-3 sentence description
    private String side;            // "LEFT" | "RIGHT" | "BOTH"
    private String emoji;           // visual hint for UI

    public Waypoint() {}

    public Waypoint(String trainId, int positionPercent,
                    String name, String narration, String side, String emoji) {
        this.trainId         = trainId;
        this.positionPercent = positionPercent;
        this.name            = name;
        this.narration       = narration;
        this.side            = side;
        this.emoji           = emoji;
    }

    public String getTrainId()          { return trainId; }
    public int    getPositionPercent()  { return positionPercent; }
    public String getName()             { return name; }
    public String getNarration()        { return narration; }
    public String getSide()             { return side; }
    public String getEmoji()            { return emoji; }

    public void setTrainId(String v)          { this.trainId = v; }
    public void setPositionPercent(int v)     { this.positionPercent = v; }
    public void setName(String v)             { this.name = v; }
    public void setNarration(String v)        { this.narration = v; }
    public void setSide(String v)             { this.side = v; }
    public void setEmoji(String v)            { this.emoji = v; }
}
