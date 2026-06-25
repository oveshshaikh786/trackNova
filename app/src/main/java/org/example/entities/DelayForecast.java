package org.example.entities;

import java.util.List;

public class DelayForecast {

    private int         onTimeProbability;    // 0-100 %
    private int         expectedDelayMinutes; // avg minutes late when delayed
    private String      riskLevel;            // LOW | MEDIUM | HIGH
    private List<String> factors;

    public DelayForecast() {}

    public DelayForecast(int onTimeProbability, int expectedDelayMinutes,
                         String riskLevel, List<String> factors) {
        this.onTimeProbability    = onTimeProbability;
        this.expectedDelayMinutes = expectedDelayMinutes;
        this.riskLevel            = riskLevel;
        this.factors              = factors;
    }

    public int          getOnTimeProbability()    { return onTimeProbability; }
    public int          getExpectedDelayMinutes() { return expectedDelayMinutes; }
    public String       getRiskLevel()            { return riskLevel; }
    public List<String> getFactors()              { return factors; }

    public void setOnTimeProbability(int v)       { this.onTimeProbability = v; }
    public void setExpectedDelayMinutes(int v)    { this.expectedDelayMinutes = v; }
    public void setRiskLevel(String v)            { this.riskLevel = v; }
    public void setFactors(List<String> v)        { this.factors = v; }
}
