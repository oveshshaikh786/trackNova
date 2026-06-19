package org.example;

import org.example.entities.DelayForecast;
import org.example.services.DelayPredictorService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DelayPredictorServiceTest {

    private final DelayPredictorService service = new DelayPredictorService();

    // ── Risk level derivation ──────────────────────────────────────────

    @Test
    void winterMonday_highRisk() {
        // AMT-101 departs 06:00 (morning rush), Monday, January → lots of deductions
        DelayForecast f = service.predict("AMT-101", "2026-01-05"); // Monday in Jan
        // base=78, Mon=-10, Jan=-12, 06:00 rush=-8, route-5 → 78-10-12-8-5 = 43 → clamped to 40 → HIGH
        assertEquals("HIGH", f.getRiskLevel());
        assertEquals(23, f.getExpectedDelayMinutes());
        assertTrue(f.getOnTimeProbability() >= 40 && f.getOnTimeProbability() <= 55);
    }

    @Test
    void midweekSummer_lowRisk() {
        // AMT-101, Wednesday in July  → midweek +5, summer -3, 06:00 rush -8, route -5 → 78+5-3-8-5=67
        // 67 is >= 55 and < 72 → MEDIUM (not LOW) because of rush hour
        // Use AMT-105 (departs 07:00, same rush window) on a midweek spring day
        // AMT-103 departs 14:00 (off-peak afternoon), route adj -9
        // Wed midweek: 78+5, spring:-2, 14:00 (no rush +0), route-9 → 72 → LOW
        DelayForecast f = service.predict("AMT-103", "2026-04-08"); // Wednesday in April
        assertEquals("LOW", f.getRiskLevel());
        assertEquals(5, f.getExpectedDelayMinutes());
    }

    @Test
    void mediumRisk_fallsInBetween() {
        // AMT-104 departs 14:00 (off-peak), route adj -8
        // Friday in June: base=78, Fri=-10, Jun=-3, 14:00=0, route-8 → 57 → MEDIUM
        DelayForecast f = service.predict("AMT-104", "2026-06-05"); // Friday in June
        assertEquals("MEDIUM", f.getRiskLevel());
        assertEquals(12, f.getExpectedDelayMinutes());
    }

    // ── On-time probability is clamped ────────────────────────────────

    @Test
    void probability_neverExceeds95() {
        DelayForecast f = service.predict("AMT-103", "2026-06-10"); // Wed midweek, summer
        assertTrue(f.getOnTimeProbability() <= 95);
    }

    @Test
    void probability_neverBelow40() {
        // Worst possible scenario — winter Monday, rush train
        DelayForecast f = service.predict("AMT-101", "2026-02-02"); // Monday in Feb
        assertTrue(f.getOnTimeProbability() >= 40);
    }

    // ── Factors list is non-empty ────────────────────────────────────

    @Test
    void predict_alwaysReturnsFactors() {
        DelayForecast f = service.predict("AMT-102", "2026-07-15");
        assertNotNull(f.getFactors());
        assertFalse(f.getFactors().isEmpty());
    }

    // ── Unknown train falls back gracefully ──────────────────────────

    @Test
    void unknownTrain_stillReturnsResult() {
        DelayForecast f = service.predict("AMT-999", "2026-04-08");
        assertNotNull(f);
        assertNotNull(f.getRiskLevel());
        assertTrue(f.getOnTimeProbability() >= 40 && f.getOnTimeProbability() <= 95);
    }

    // ── Bad date string falls back to today ──────────────────────────

    @Test
    void badDateString_doesNotThrow() {
        assertDoesNotThrow(() -> service.predict("AMT-101", "not-a-date"));
    }
}
