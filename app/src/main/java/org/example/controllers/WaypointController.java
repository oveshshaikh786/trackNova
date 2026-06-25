package org.example.controllers;

import org.example.entities.Waypoint;
import org.example.services.WaypointService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * WindowAI REST endpoints.
 */
@RestController
@RequestMapping("/api")
public class WaypointController {

    private final WaypointService waypointService;

    public WaypointController(WaypointService waypointService) {
        this.waypointService = waypointService;
    }

    /**
     * GET /api/waypoints/{trainId}
     * Returns all landmark waypoints for a train route, ordered by position.
     */
    @GetMapping("/waypoints/{trainId}")
    public ResponseEntity<List<Waypoint>> getWaypoints(@PathVariable String trainId) {
        List<Waypoint> waypoints = waypointService.getWaypoints(trainId);
        return ResponseEntity.ok(waypoints);
    }

    /**
     * GET /api/journey/current?trainId=AMT-101&departureTime=06:00&currentTime=08:30
     * Returns current waypoint + upcoming waypoints + journey progress.
     */
    @GetMapping("/journey/current")
    public ResponseEntity<Map<String, Object>> getCurrentJourneyState(
            @RequestParam String trainId,
            @RequestParam String departureTime,
            @RequestParam String currentTime) {
        Map<String, Object> state = waypointService.getCurrentJourneyState(
                trainId, departureTime, currentTime);
        return ResponseEntity.ok(state);
    }
}
