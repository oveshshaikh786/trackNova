package org.example.controllers;

import org.example.entities.*;
import org.example.security.JwtUtil;
import org.example.services.DelayPredictorService;
import org.example.services.TrainService;
import org.example.services.UserBookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserBookingService     userBookingService;
    private final TrainService           trainService;
    private final JwtUtil                jwtUtil;
    private final DelayPredictorService  delayPredictorService;

    public UserController(UserBookingService userBookingService, TrainService trainService,
                          JwtUtil jwtUtil, DelayPredictorService delayPredictorService) {
        this.userBookingService    = userBookingService;
        this.trainService          = trainService;
        this.jwtUtil               = jwtUtil;
        this.delayPredictorService = delayPredictorService;
    }

    // ── Auth ─────────────────────────────────────────────────────────── //

    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody LoginRequest req) {
        boolean ok = userBookingService.signUp(req.getName(), req.getPassword());
        if (ok) return ResponseEntity.ok(Map.of("message", "Signup successful"));
        return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String reason = userBookingService.authenticateWithReason(req.getName(), req.getPassword());
        if ("SUSPENDED".equals(reason))
            return ResponseEntity.status(403).body(Map.of("message", "Account suspended. Contact support."));
        if (!"OK".equals(reason))
            return ResponseEntity.status(401).body(Map.of("message", "Invalid username or password"));

        User user = userBookingService.authenticateUser(req.getName(), req.getPassword());
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("message", "Login failed"));

        String token = jwtUtil.generateToken(user.getUserId(), user.getName(), user.getRole());
        return ResponseEntity.ok(new LoginResponse(user.getUserId(), user.getName(), user.getRole(), token, "Login successful"));
    }

    // ── PredictRail ──────────────────────────────────────────────────── //

    @GetMapping("/trains/delay-forecast")
    public ResponseEntity<DelayForecast> delayForecast(@RequestParam String trainId,
                                                        @RequestParam(required = false) String date) {
        String d = (date != null && !date.isBlank()) ? date : LocalDate.now().toString();
        return ResponseEntity.ok(delayPredictorService.predict(trainId, d));
    }

    // ── Public Departure Board ───────────────────────────────────────── //

    /** Returns all trains for the live departure board — public, no auth required. */
    @GetMapping("/departures")
    public ResponseEntity<List<Train>> getDepartures() {
        return ResponseEntity.ok(trainService.getAllTrains());
    }

    // ── Stations / Trains ────────────────────────────────────────────── //

    @GetMapping("/stations")
    public ResponseEntity<Set<String>> getStations() {
        return ResponseEntity.ok(userBookingService.getAllAvailableStations());
    }

    @GetMapping("/trains/search")
    public ResponseEntity<?> searchTrains(@RequestParam String source, @RequestParam String destination) {
        List<?> trains = userBookingService.getTrains(source, destination);
        if (trains.isEmpty()) return ResponseEntity.ok(Map.of("message", "No trains found for this route"));
        return ResponseEntity.ok(trains);
    }

    /** Fresh single-train fetch so SeatBookingPage always has up-to-date seat data */
    @GetMapping("/trains/{trainId}")
    public ResponseEntity<?> getTrain(@PathVariable String trainId) {
        return trainService.getTrainById(trainId)
                .map(t -> (ResponseEntity<?>) ResponseEntity.ok(t))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Announcements (public — show on frontend) ────────────────────── //

    @GetMapping("/announcements")
    public ResponseEntity<List<Announcement>> getAnnouncements() {
        return ResponseEntity.ok(userBookingService.getActiveAnnouncements());
    }

    // ── Promo validation ─────────────────────────────────────────────── //

    @GetMapping("/promo/validate")
    public ResponseEntity<?> validatePromo(@RequestParam String code) {
        int pct = userBookingService.validatePromoCode(code);
        if (pct < 0) return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Invalid or expired code"));
        return ResponseEntity.ok(Map.of("valid", true, "discountPercent", pct));
    }

    // ── Bookings ─────────────────────────────────────────────────────── //

    @GetMapping("/bookings")
    public ResponseEntity<List<Ticket>> fetchBookings(@RequestParam String userId) {
        return ResponseEntity.ok(userBookingService.getBookingsByUserId(userId));
    }

    @GetMapping("/bookings/search")
    public ResponseEntity<List<Ticket>> searchBookings(
            @RequestParam String userId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String fareClass,
            @RequestParam(required = false) String tripType) {
        return ResponseEntity.ok(userBookingService.searchBookings(userId, query, fareClass, tripType));
    }

    @PostMapping("/book")
    public ResponseEntity<?> bookSeat(@RequestBody BookingRequest req) {
        int discountPct = 0;
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            discountPct = userBookingService.validatePromoCode(req.getPromoCode());
            if (discountPct < 0) discountPct = 0;
        }

        // Round-trip booking
        if (req.isRoundTrip()) {
            List<Ticket> tickets = userBookingService.bookRoundTrip(req, discountPct);
            if (tickets.isEmpty())
                return ResponseEntity.badRequest().body(Map.of("message", "One or more seats unavailable"));
            if (req.getPromoCode() != null && !req.getPromoCode().isBlank())
                userBookingService.incrementPromoUsage(req.getPromoCode());
            return ResponseEntity.ok(Map.of("message", "Round-trip booked", "tickets", tickets.size()));
        }

        // Multi-seat booking
        List<Ticket> tickets = userBookingService.bookMultipleSeats(
                req.getUserId(), req.getTrainId(), req.resolvedSeats(),
                req.getSource(), req.getDestination(), req.getDateOfTravel(),
                req.getPromoCode(), discountPct);
        if (tickets.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Seat unavailable or invalid position"));
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank())
            userBookingService.incrementPromoUsage(req.getPromoCode());
        return ResponseEntity.ok(Map.of("message", "Booking confirmed", "tickets", tickets.size()));
    }

    @DeleteMapping("/cancel/{ticketId}")
    public ResponseEntity<?> cancelBooking(@PathVariable String ticketId, @RequestParam String userId) {
        boolean ok = userBookingService.cancelBookingByUserId(ticketId, userId);
        if (ok) return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully"));
        return ResponseEntity.status(404).body(Map.of("message", "Ticket not found or not yours"));
    }

    // ── Waitlist ─────────────────────────────────────────────────────── //

    @PostMapping("/waitlist")
    public ResponseEntity<?> joinWaitlist(@RequestBody Map<String, String> body) {
        String userId      = body.get("userId");
        String trainId     = body.get("trainId");
        String source      = body.get("source");
        String destination = body.get("destination");
        String date        = body.get("dateOfTravel");
        String fareClass   = body.getOrDefault("fareClass", "ECONOMY");
        if (userId == null || trainId == null || date == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
        WaitlistEntry entry = userBookingService.joinWaitlist(userId, trainId, source, destination, date, fareClass);
        if (entry == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Already on waitlist or user not found"));
        return ResponseEntity.ok(entry);
    }

    @GetMapping("/waitlist")
    public ResponseEntity<List<WaitlistEntry>> getWaitlist(@RequestParam String userId) {
        return ResponseEntity.ok(userBookingService.getWaitlistByUser(userId));
    }

    @DeleteMapping("/waitlist/{entryId}")
    public ResponseEntity<?> cancelWaitlist(@PathVariable String entryId, @RequestParam String userId) {
        boolean ok = userBookingService.cancelWaitlist(entryId, userId);
        return ok ? ResponseEntity.ok(Map.of("message", "Removed from waitlist"))
                  : ResponseEntity.status(404).body(Map.of("message", "Entry not found"));
    }

    @GetMapping("/admin/waitlist")
    public ResponseEntity<List<WaitlistEntry>> adminGetWaitlist() {
        return ResponseEntity.ok(userBookingService.getAllWaitlist());
    }

    // ── Profile ──────────────────────────────────────────────────────── //

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestParam String userId) {
        return userBookingService.getProfile(userId).map(u -> {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("userId",    u.getUserId());  p.put("name",      u.getName());
            p.put("firstName", u.getFirstName()); p.put("lastName", u.getLastName());
            p.put("age",       u.getAge());     p.put("phone",     u.getPhone());
            p.put("role",      u.getRole());    p.put("suspended", u.isSuspended());
            return ResponseEntity.ok(p);
        }).orElse(ResponseEntity.status(404).build());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody ProfileUpdateRequest req) {
        boolean ok = userBookingService.updateProfile(req.getUserId(), req.getFirstName(),
                req.getLastName(), req.getAge(), req.getPhone());
        if (ok) return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
        return ResponseEntity.status(404).body(Map.of("message", "User not found"));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<?> changeOwnPassword(@RequestBody Map<String, String> body) {
        boolean ok = userBookingService.changeOwnPassword(body.get("userId"),
                body.get("currentPassword"), body.get("newPassword"));
        if (ok) return ResponseEntity.ok(Map.of("message", "Password changed"));
        return ResponseEntity.status(400).body(Map.of("message", "Current password is incorrect"));
    }

    // ── Admin — Users ────────────────────────────────────────────────── //

    @GetMapping("/admin/users")
    public ResponseEntity<List<User>> adminGetUsers() {
        return ResponseEntity.ok(userBookingService.getAllUsers());
    }

    @PutMapping("/admin/users/{userId}/role")
    public ResponseEntity<?> adminSetRole(@PathVariable String userId,
                                          @RequestBody Map<String, String> body) {
        String role = body.get("role");
        if (role == null || (!role.equalsIgnoreCase("ADMIN") && !role.equalsIgnoreCase("USER")))
            return ResponseEntity.badRequest().body(Map.of("message", "Role must be ADMIN or USER"));
        boolean ok = userBookingService.setUserRole(userId, role);
        return ok ? ResponseEntity.ok(Map.of("message", "Role updated"))
                  : ResponseEntity.status(404).body(Map.of("message", "User not found"));
    }

    @PutMapping("/admin/users/{userId}/suspend")
    public ResponseEntity<?> adminSuspendUser(@PathVariable String userId,
                                               @RequestBody Map<String, Object> body) {
        boolean suspended = Boolean.TRUE.equals(body.get("suspended"));
        boolean ok = userBookingService.suspendUser(userId, suspended);
        return ok ? ResponseEntity.ok(Map.of("message", suspended ? "User suspended" : "User unsuspended"))
                  : ResponseEntity.status(404).body(Map.of("message", "User not found"));
    }

    @DeleteMapping("/admin/users/{userId}")
    public ResponseEntity<?> adminDeleteUser(@PathVariable String userId) {
        boolean ok = userBookingService.deleteUser(userId);
        return ok ? ResponseEntity.ok(Map.of("message", "User deleted"))
                  : ResponseEntity.status(404).body(Map.of("message", "User not found"));
    }

    @PutMapping("/admin/users/{userId}/password")
    public ResponseEntity<?> adminResetPassword(@PathVariable String userId,
                                                @RequestBody Map<String, String> body) {
        String pwd = body.get("newPassword");
        if (pwd == null || pwd.length() < 4)
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 4 characters"));
        boolean ok = userBookingService.adminResetPassword(userId, pwd);
        return ok ? ResponseEntity.ok(Map.of("message", "Password reset"))
                  : ResponseEntity.status(404).body(Map.of("message", "User not found"));
    }

    // ── Admin — Bookings ─────────────────────────────────────────────── //

    @GetMapping("/admin/bookings")
    public ResponseEntity<List<Ticket>> adminGetBookings() {
        return ResponseEntity.ok(userBookingService.getAllBookings());
    }

    @DeleteMapping("/admin/bookings/{ticketId}")
    public ResponseEntity<?> adminCancelBooking(@PathVariable String ticketId) {
        boolean ok = userBookingService.adminCancelBooking(ticketId);
        return ok ? ResponseEntity.ok(Map.of("message", "Booking cancelled and seat freed"))
                  : ResponseEntity.status(404).body(Map.of("message", "Ticket not found"));
    }

    // ── Admin — Trains ───────────────────────────────────────────────── //

    @GetMapping("/admin/trains")
    public ResponseEntity<List<Train>> adminGetTrains() {
        return ResponseEntity.ok(trainService.getAllTrains());
    }

    @PostMapping("/admin/trains")
    public ResponseEntity<?> adminSaveTrain(@RequestBody Train train) {
        return ResponseEntity.ok(trainService.saveTrain(train));
    }

    @DeleteMapping("/admin/trains/{trainId}")
    public ResponseEntity<?> adminDeleteTrain(@PathVariable String trainId) {
        trainService.deleteTrain(trainId);
        return ResponseEntity.ok(Map.of("message", "Train deleted"));
    }

    @PutMapping("/admin/trains/{trainId}/status")
    public ResponseEntity<?> adminSetTrainStatus(@PathVariable String trainId,
                                                  @RequestBody Map<String, Object> body) {
        Optional<Train> trainOpt = trainService.getTrainById(trainId);
        if (trainOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Train not found"));
        Train train = trainOpt.get();
        String status = (String) body.get("status");
        if (status != null) train.setStatus(status);
        Object dm = body.get("delayMinutes");
        if (dm != null) train.setDelayMinutes(((Number) dm).intValue());
        Object reason = body.get("statusReason");
        if (reason != null) train.setStatusReason((String) reason);
        trainService.saveTrain(train);
        return ResponseEntity.ok(Map.of("message", "Status updated"));
    }

    // ── Admin — Revenue ──────────────────────────────────────────────── //

    @GetMapping("/admin/revenue")
    public ResponseEntity<Map<String, Object>> adminRevenue() {
        return ResponseEntity.ok(userBookingService.getRevenueStats());
    }

    // ── Admin — Announcements ────────────────────────────────────────── //

    @GetMapping("/admin/announcements")
    public ResponseEntity<List<Announcement>> adminGetAnnouncements() {
        return ResponseEntity.ok(userBookingService.getAllAnnouncements());
    }

    @PostMapping("/admin/announcements")
    public ResponseEntity<?> adminCreateAnnouncement(@RequestBody Map<String, String> body) {
        String msg  = body.get("message");
        String type = body.getOrDefault("type", "INFO");
        if (msg == null || msg.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Message required"));
        return ResponseEntity.ok(userBookingService.createAnnouncement(msg, type));
    }

    @PutMapping("/admin/announcements/{id}/toggle")
    public ResponseEntity<?> adminToggleAnnouncement(@PathVariable String id,
                                                      @RequestBody Map<String, Object> body) {
        boolean active = Boolean.TRUE.equals(body.get("active"));
        boolean ok = userBookingService.toggleAnnouncement(id, active);
        return ok ? ResponseEntity.ok(Map.of("message", "Updated"))
                  : ResponseEntity.status(404).body(Map.of("message", "Not found"));
    }

    @DeleteMapping("/admin/announcements/{id}")
    public ResponseEntity<?> adminDeleteAnnouncement(@PathVariable String id) {
        boolean ok = userBookingService.deleteAnnouncement(id);
        return ok ? ResponseEntity.ok(Map.of("message", "Deleted"))
                  : ResponseEntity.status(404).body(Map.of("message", "Not found"));
    }

    // ── Admin — Promo Codes ──────────────────────────────────────────── //

    @GetMapping("/admin/promo-codes")
    public ResponseEntity<List<PromoCode>> adminGetPromoCodes() {
        return ResponseEntity.ok(userBookingService.getAllPromoCodes());
    }

    @PostMapping("/admin/promo-codes")
    public ResponseEntity<?> adminCreatePromoCode(@RequestBody Map<String, Object> body) {
        String code    = (String) body.get("code");
        int    pct     = body.get("discountPercent") != null ? ((Number) body.get("discountPercent")).intValue() : 0;
        int    maxUses = body.get("maxUses")         != null ? ((Number) body.get("maxUses")).intValue() : 100;
        String expires = (String) body.get("expiresAt");
        if (code == null || code.isBlank() || pct <= 0 || pct > 100)
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid code or discount"));
        return ResponseEntity.ok(userBookingService.createPromoCode(code, pct, maxUses, expires));
    }

    @DeleteMapping("/admin/promo-codes/{code}")
    public ResponseEntity<?> adminDeletePromoCode(@PathVariable String code) {
        boolean ok = userBookingService.deletePromoCode(code);
        return ok ? ResponseEntity.ok(Map.of("message", "Deleted"))
                  : ResponseEntity.status(404).body(Map.of("message", "Not found"));
    }
}
