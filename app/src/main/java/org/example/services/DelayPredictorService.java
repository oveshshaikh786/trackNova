package org.example.services;

import org.example.entities.DelayForecast;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * PredictRail — rule-based delay forecast engine.
 *
 * Models the same features as the IEEE Amtrak ML paper:
 *   day-of-week, departure hour, seasonal weather, route-specific history.
 *
 * The interface is ML-ready: swap predict() body for a real model call
 * (Random Forest / LSTM) without touching callers or the REST layer.
 */
@Service
public class DelayPredictorService {

    /** Route-specific on-time adjustment (pp). Negative = worse on-time. */
    private static final Map<String, Integer> ROUTE_ADJ = Map.of(
        "AMT-101", -5,   // Northeast Regional  — NEC congestion + freight sharing
        "AMT-102", -3,   // Acela Express        — premium but same NEC tracks
        "AMT-103", -9,   // California Zephyr    — longest route, mountain grades
        "AMT-104", -8,   // Empire Builder       — transcontinental, freight priority
        "AMT-105", -4    // Silver Star          — southern corridor
    );

    /** Departure hour (24h) from seeded schedule. */
    private static final Map<String, Integer> DEP_HOUR = Map.of(
        "AMT-101", 6,
        "AMT-102", 5,
        "AMT-103", 14,
        "AMT-104", 14,
        "AMT-105", 7
    );

    private static final Map<String, String> ROUTE_FACTOR = Map.of(
        "AMT-101", "NEC shared track with freight",
        "AMT-102", "NEC shared track with freight",
        "AMT-103", "Long-distance mountain grades",
        "AMT-104", "Long-distance transcontinental route",
        "AMT-105", "Southern corridor, multi-state"
    );

    /**
     * Predict on-time performance for a given train on a given date.
     *
     * @param trainId  e.g. "AMT-101"
     * @param dateStr  ISO date "YYYY-MM-DD"; falls back to today if unparseable
     */
    public DelayForecast predict(String trainId, String dateStr) {
        int base = 78;
        List<String> factors = new ArrayList<>();

        // ── Date parsing ────────────────────────────────────────────────
        LocalDate date;
        try { date = LocalDate.parse(dateStr); }
        catch (Exception e) { date = LocalDate.now(); }

        // ── Day-of-week effect ──────────────────────────────────────────
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.MONDAY || dow == DayOfWeek.FRIDAY) {
            base -= 10;
            factors.add("High-traffic travel day (Mon/Fri)");
        } else if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            base -= 5;
            factors.add("Weekend leisure demand");
        } else {
            base += 5;
            factors.add("Midweek — lower network congestion");
        }

        // ── Seasonal effect ─────────────────────────────────────────────
        Month month = date.getMonth();
        if (month == Month.DECEMBER || month == Month.JANUARY || month == Month.FEBRUARY) {
            base -= 12;
            factors.add("Winter weather risk (ice / snow)");
        } else if (month == Month.JUNE || month == Month.JULY || month == Month.AUGUST) {
            base -= 3;
            factors.add("Summer peak season");
        } else if (month == Month.MARCH || month == Month.APRIL) {
            base -= 2;
            factors.add("Spring storm season");
        }

        // ── Departure-time effect ───────────────────────────────────────
        int hour = DEP_HOUR.getOrDefault(trainId, 12);
        if (hour >= 7 && hour <= 9) {
            base -= 8;
            factors.add("Morning rush-hour departure");
        } else if (hour >= 17 && hour <= 19) {
            base -= 8;
            factors.add("Evening rush-hour departure");
        } else if (hour >= 22 || hour <= 5) {
            base += 4;
            factors.add("Off-peak overnight departure");
        }

        // ── Route-specific effect ───────────────────────────────────────
        base += ROUTE_ADJ.getOrDefault(trainId, 0);
        factors.add(ROUTE_FACTOR.getOrDefault(trainId, "Standard route"));

        // ── Clamp 40–95 ─────────────────────────────────────────────────
        base = Math.max(40, Math.min(95, base));

        // ── Derive risk level + expected delay ──────────────────────────
        String riskLevel;
        int expectedDelay;
        if (base < 55) {
            riskLevel     = "HIGH";
            expectedDelay = 23;
        } else if (base < 72) {
            riskLevel     = "MEDIUM";
            expectedDelay = 12;
        } else {
            riskLevel     = "LOW";
            expectedDelay = 5;
        }

        return new DelayForecast(base, expectedDelay, riskLevel, factors);
    }
}
