package org.example.services;

import org.example.entities.*;
import org.example.repositories.*;
import org.example.util.UserServiceUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserBookingService {

    private final UserRepository         userRepository;
    private final TicketRepository       ticketRepository;
    private final TrainService           trainService;
    private final AnnouncementRepository announcementRepository;
    private final PromoCodeRepository    promoCodeRepository;
    private final WaitlistRepository     waitlistRepository;
    private final EmailService           emailService;

    public UserBookingService(UserRepository userRepository,
                               TicketRepository ticketRepository,
                               TrainService trainService,
                               AnnouncementRepository announcementRepository,
                               PromoCodeRepository promoCodeRepository,
                               WaitlistRepository waitlistRepository,
                               EmailService emailService) {
        this.userRepository         = userRepository;
        this.ticketRepository       = ticketRepository;
        this.trainService           = trainService;
        this.announcementRepository = announcementRepository;
        this.promoCodeRepository    = promoCodeRepository;
        this.waitlistRepository     = waitlistRepository;
        this.emailService           = emailService;
    }

    // ── Auth ─────────────────────────────────────────────────────────── //

    /** Returns User or null. Null also returned for suspended users. */
    public User authenticateUser(String username, String password) {
        return userRepository.findByName(username)
                .filter(u -> !u.isSuspended())
                .filter(u -> UserServiceUtil.checkPassword(password, u.getHashedPassword()))
                .map(u -> {
                    u.setLastLogin(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
                    userRepository.save(u);
                    return u;
                })
                .orElse(null);
    }

    /** Returns "SUSPENDED" if account is suspended, "INVALID" if wrong credentials, "OK" if success. */
    public String authenticateWithReason(String username, String password) {
        Optional<User> userOpt = userRepository.findByName(username);
        if (userOpt.isEmpty()) return "INVALID";
        User u = userOpt.get();
        if (u.isSuspended()) return "SUSPENDED";
        if (!UserServiceUtil.checkPassword(password, u.getHashedPassword())) return "INVALID";
        u.setLastLogin(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        userRepository.save(u);
        return "OK";
    }

    public boolean signUp(String name, String password) {
        if (userRepository.existsByName(name)) return false;
        User user = new User();
        user.setUserId(UUID.randomUUID().toString());
        user.setName(name);
        user.setHashedPassword(UserServiceUtil.hashPassword(password));
        user.setRole("USER");
        userRepository.save(user);
        return true;
    }

    // ── Bookings ─────────────────────────────────────────────────────── //

    public List<Ticket> getBookingsByUserId(String userId) {
        return ticketRepository.findByUserUserId(userId);
    }

    /** Single-seat booking (legacy — delegates to multi-seat) */
    @Transactional
    public boolean bookTrainSeatByRequest(String userId, String trainId, int row, int col,
                                          String source, String destination, String dateOfTravel) {
        List<Ticket> booked = bookMultipleSeats(userId, trainId,
                List.of(new int[]{row, col}), source, destination, dateOfTravel, null, 0);
        return !booked.isEmpty();
    }

    /**
     * Multi-seat booking — books all requested seats atomically.
     * Returns list of created tickets (empty = failed).
     * promoCode may be null; discountPct = 0 if no promo.
     */
    @Transactional
    public List<Ticket> bookMultipleSeats(String userId, String trainId,
                                           List<int[]> seatList,
                                           String source, String destination,
                                           String dateOfTravel, String promoCode, int discountPct) {
        Optional<Train> trainOpt = trainService.getTrainById(trainId);
        if (trainOpt.isEmpty()) return List.of();
        Train train = trainOpt.get();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return List.of();
        User user = userOpt.get();

        List<List<Integer>> seats = train.getSeats();
        // Validate all seats are free before booking any
        for (int[] rc : seatList) {
            int r = rc[0], c = rc[1];
            if (r < 0 || r >= seats.size() || c < 0 || c >= seats.get(r).size()) return List.of();
            if (seats.get(r).get(c) != 0) return List.of();
        }

        List<Ticket> created = new ArrayList<>();
        String pairId = seatList.size() > 1 ? UUID.randomUUID().toString() : null;

        // Deep-copy seats so Hibernate dirty-checking sees a new reference and issues UPDATE
        List<List<Integer>> freshSeats = seats.stream()
                .map(ArrayList::new)
                .collect(Collectors.toList());

        for (int[] rc : seatList) {
            int r = rc[0], c = rc[1];
            freshSeats.get(r).set(c, 1);
            int basePrice = train.getPriceForRow(r);
            int paid = discountPct > 0 ? (int) Math.round(basePrice * (1 - discountPct / 100.0)) : basePrice;

            Ticket ticket = new Ticket(UUID.randomUUID().toString(), user, train,
                    source, destination, dateOfTravel, r, c);
            ticket.setFareClass(Train.getFareClassForRow(r));
            ticket.setPricePaid(paid);
            if (pairId != null) ticket.setTripPairId(pairId);
            created.add(ticket);
        }

        train.setSeats(freshSeats);
        trainService.saveTrain(train);
        ticketRepository.saveAll(created);

        // Send confirmation email (best-effort)
        if (!created.isEmpty()) {
            emailService.sendBookingConfirmation(user.getPhone(), created.get(0)); // phone used as email placeholder
        }
        return created;
    }

    /**
     * Round-trip booking — books outbound + return legs atomically.
     */
    @Transactional
    public List<Ticket> bookRoundTrip(BookingRequest req, int discountPct) {
        String pairId = UUID.randomUUID().toString();

        Optional<Train> outTrain = trainService.getTrainById(req.getTrainId());
        Optional<Train> retTrain = trainService.getTrainById(req.getReturnTrainId());
        Optional<User>  userOpt  = userRepository.findById(req.getUserId());
        if (outTrain.isEmpty() || retTrain.isEmpty() || userOpt.isEmpty()) return List.of();

        User user = userOpt.get();
        List<Ticket> allTickets = new ArrayList<>();

        // Outbound seats
        List<int[]> outSeats = req.getSeats() != null ? req.getSeats() : List.of(new int[]{req.getRow(), req.getCol()});
        allTickets.addAll(bookLeg(user, outTrain.get(), outSeats,
                req.getSource(), req.getDestination(), req.getDateOfTravel(),
                "OUTBOUND", pairId, discountPct));

        if (allTickets.isEmpty()) return List.of();

        // Return seats
        List<int[]> retSeats = req.getReturnSeats() != null ? req.getReturnSeats()
                : List.of(new int[]{req.getReturnRow(), req.getReturnCol()});
        allTickets.addAll(bookLeg(user, retTrain.get(), retSeats,
                req.getDestination(), req.getSource(), req.getReturnDate(),
                "RETURN", pairId, discountPct));

        return allTickets;
    }

    private List<Ticket> bookLeg(User user, Train train, List<int[]> seatList,
                                  String source, String destination, String date,
                                  String tripType, String pairId, int discountPct) {
        List<List<Integer>> seats = train.getSeats();
        for (int[] rc : seatList) {
            int r = rc[0], c = rc[1];
            if (r < 0 || r >= seats.size() || c < 0 || c >= seats.get(r).size()) return List.of();
            if (seats.get(r).get(c) != 0) return List.of();
        }
        List<Ticket> created = new ArrayList<>();
        // Deep-copy seats so Hibernate dirty-checking sees a new reference and issues UPDATE
        List<List<Integer>> freshSeats = seats.stream()
                .map(ArrayList::new)
                .collect(Collectors.toList());
        for (int[] rc : seatList) {
            int r = rc[0], c = rc[1];
            freshSeats.get(r).set(c, 1);
            int basePrice = train.getPriceForRow(r);
            int paid = discountPct > 0 ? (int) Math.round(basePrice * (1 - discountPct / 100.0)) : basePrice;
            Ticket t = new Ticket(UUID.randomUUID().toString(), user, train, source, destination, date, r, c);
            t.setFareClass(Train.getFareClassForRow(r));
            t.setPricePaid(paid);
            t.setTripType(tripType);
            t.setTripPairId(pairId);
            created.add(t);
        }
        train.setSeats(freshSeats);
        trainService.saveTrain(train);
        ticketRepository.saveAll(created);
        return created;
    }

    @Transactional
    public boolean cancelBookingByUserId(String ticketId, String userId) {
        Optional<Ticket> ticketOpt = ticketRepository.findById(ticketId);
        if (ticketOpt.isEmpty()) return false;
        Ticket ticket = ticketOpt.get();
        if (!userId.equals(ticket.getUserId())) return false;

        String trainName = ticket.getTrain() != null ? ticket.getTrain().getName() : "";
        freeSeat(ticket);
        ticketRepository.delete(ticket);

        // Try to auto-book next waitlist entry for this train+date
        if (ticket.getTrain() != null)
            processWaitlist(ticket.getTrain().getTrainId(), ticket.getDateOfTravel());
        return true;
    }

    /** Admin force-cancel — no ownership check */
    @Transactional
    public boolean adminCancelBooking(String ticketId) {
        Optional<Ticket> ticketOpt = ticketRepository.findById(ticketId);
        if (ticketOpt.isEmpty()) return false;
        Ticket ticket = ticketOpt.get();
        freeSeat(ticket);
        ticketRepository.delete(ticket);
        if (ticket.getTrain() != null)
            processWaitlist(ticket.getTrain().getTrainId(), ticket.getDateOfTravel());
        return true;
    }

    // ── Waitlist ──────────────────────────────────────────────────────── //

    public WaitlistEntry joinWaitlist(String userId, String trainId, String source,
                                       String destination, String dateOfTravel, String fareClass) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return null;
        // Prevent duplicate waitlist entries
        if (waitlistRepository.existsByUserIdAndTrainIdAndDateOfTravelAndStatus(
                userId, trainId, dateOfTravel, "WAITING")) return null;
        User user = userOpt.get();
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        WaitlistEntry entry = new WaitlistEntry(UUID.randomUUID().toString(), userId, user.getName(),
                trainId, source, destination, dateOfTravel,
                fareClass != null ? fareClass : "ECONOMY", ts);
        WaitlistEntry saved = waitlistRepository.save(entry);
        // Email notification
        trainService.getTrainById(trainId).ifPresent(t ->
                emailService.sendWaitlistNotification(user.getPhone(), t.getName(), dateOfTravel));
        return saved;
    }

    public List<WaitlistEntry> getWaitlistByUser(String userId) {
        return waitlistRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public boolean cancelWaitlist(String entryId, String userId) {
        return waitlistRepository.findById(entryId).map(e -> {
            if (!userId.equals(e.getUserId())) return false;
            e.setStatus("CANCELLED");
            waitlistRepository.save(e);
            return true;
        }).orElse(false);
    }

    public List<WaitlistEntry> getAllWaitlist() {
        return waitlistRepository.findAll();
    }

    /** Auto-book the first WAITING entry for a train+date when a seat frees up */
    private void processWaitlist(String trainId, String dateOfTravel) {
        if (dateOfTravel == null) return;
        List<WaitlistEntry> queue = waitlistRepository
                .findByTrainIdAndDateOfTravelAndStatusOrderByCreatedAtAsc(trainId, dateOfTravel, "WAITING");
        if (queue.isEmpty()) return;

        Optional<Train> trainOpt = trainService.getTrainById(trainId);
        if (trainOpt.isEmpty()) return;
        Train train = trainOpt.get();

        for (WaitlistEntry entry : queue) {
            // Find first free seat matching fare class
            int[] seat = findFreeSeatForClass(train, entry.getFareClass());
            if (seat == null) continue;

            Optional<User> userOpt = userRepository.findById(entry.getUserId());
            if (userOpt.isEmpty()) { entry.setStatus("CANCELLED"); waitlistRepository.save(entry); continue; }
            User user = userOpt.get();

            List<List<Integer>> seats = train.getSeats();
            // Deep-copy to force JPA dirty detection
            List<List<Integer>> freshSeats = seats.stream().map(ArrayList::new).collect(Collectors.toList());
            freshSeats.get(seat[0]).set(seat[1], 1);
            train.setSeats(freshSeats);
            trainService.saveTrain(train);

            Ticket ticket = new Ticket(UUID.randomUUID().toString(), user, train,
                    entry.getSource(), entry.getDestination(), dateOfTravel, seat[0], seat[1]);
            ticket.setFareClass(Train.getFareClassForRow(seat[0]));
            ticket.setPricePaid(train.getPriceForRow(seat[0]));
            ticketRepository.save(ticket);

            entry.setStatus("BOOKED");
            waitlistRepository.save(entry);
            emailService.sendBookingConfirmation(user.getPhone(), ticket);
            break; // one seat freed = one entry promoted
        }
    }

    private int[] findFreeSeatForClass(Train train, String fareClass) {
        List<List<Integer>> seats = train.getSeats();
        int startRow = 0, endRow = seats.size();
        if ("FIRST".equals(fareClass))    { startRow = 9; endRow = seats.size(); }
        else if ("BUSINESS".equals(fareClass)) { startRow = 6; endRow = 9; }
        else                               { startRow = 0; endRow = 6; }
        for (int r = startRow; r < Math.min(endRow, seats.size()); r++) {
            for (int c = 0; c < seats.get(r).size(); c++) {
                if (seats.get(r).get(c) == 0) return new int[]{r, c};
            }
        }
        return null;
    }

    private void freeSeat(Ticket ticket) {
        if (ticket.getTrain() == null) return;
        trainService.getTrainById(ticket.getTrain().getTrainId()).ifPresent(train -> {
            List<List<Integer>> seats = train.getSeats();
            int r = ticket.getSeatRow(), c = ticket.getSeatCol();
            if (r < seats.size() && c < seats.get(r).size()) {
                // Deep-copy to force JPA dirty detection
                List<List<Integer>> freshSeats = seats.stream().map(ArrayList::new).collect(Collectors.toList());
                freshSeats.get(r).set(c, 0);
                train.setSeats(freshSeats);
                trainService.saveTrain(train);
            }
        });
    }

    // ── Profile ──────────────────────────────────────────────────────── //

    public Optional<User> getProfile(String userId)    { return userRepository.findById(userId); }

    public boolean updateProfile(String userId, String firstName, String lastName, String age, String phone) {
        return userRepository.findById(userId).map(u -> {
            u.setFirstName(firstName); u.setLastName(lastName);
            u.setAge(age); u.setPhone(phone);
            userRepository.save(u); return true;
        }).orElse(false);
    }

    /** Search + filter user's own bookings */
    public List<Ticket> searchBookings(String userId, String query, String fareClass, String tripType) {
        List<Ticket> all = ticketRepository.findByUserUserId(userId);
        return all.stream().filter(t -> {
            if (query != null && !query.isBlank()) {
                String q = query.toLowerCase();
                boolean matchTrain = t.getTrain() != null && t.getTrain().getName().toLowerCase().contains(q);
                boolean matchRoute = (t.getSource() + " " + t.getDestination()).toLowerCase().contains(q);
                boolean matchDate  = t.getDateOfTravel() != null && t.getDateOfTravel().contains(q);
                if (!matchTrain && !matchRoute && !matchDate) return false;
            }
            if (fareClass != null && !fareClass.isBlank() && !"ALL".equals(fareClass))
                if (!fareClass.equalsIgnoreCase(t.getFareClass())) return false;
            if (tripType != null && !tripType.isBlank() && !"ALL".equals(tripType))
                if (!tripType.equalsIgnoreCase(t.getTripType())) return false;
            return true;
        }).collect(Collectors.toList());
    }

    // ── Train helpers ────────────────────────────────────────────────── //

    public Set<String> getAllAvailableStations() { return trainService.getAllStations(); }

    public List<Train> getTrains(String source, String destination) {
        return trainService.searchTrains(source, destination);
    }

    // ── Admin — Users ────────────────────────────────────────────────── //

    public List<User> getAllUsers()            { return userRepository.findAll(); }
    public List<Ticket> getAllBookings()        { return ticketRepository.findAll(); }

    public boolean setUserRole(String userId, String role) {
        return userRepository.findById(userId).map(u -> {
            u.setRole(role.toUpperCase()); userRepository.save(u); return true;
        }).orElse(false);
    }

    public boolean suspendUser(String userId, boolean suspended) {
        return userRepository.findById(userId).map(u -> {
            u.setSuspended(suspended); userRepository.save(u); return true;
        }).orElse(false);
    }

    @Transactional
    public boolean deleteUser(String userId) {
        if (!userRepository.existsById(userId)) return false;
        ticketRepository.deleteAll(ticketRepository.findByUserUserId(userId));
        userRepository.deleteById(userId);
        return true;
    }

    public boolean adminResetPassword(String userId, String newPassword) {
        return userRepository.findById(userId).map(u -> {
            u.setHashedPassword(UserServiceUtil.hashPassword(newPassword));
            userRepository.save(u); return true;
        }).orElse(false);
    }

    public boolean changeOwnPassword(String userId, String currentPassword, String newPassword) {
        return userRepository.findById(userId).map(u -> {
            if (!UserServiceUtil.checkPassword(currentPassword, u.getHashedPassword())) return false;
            u.setHashedPassword(UserServiceUtil.hashPassword(newPassword));
            userRepository.save(u); return true;
        }).orElse(false);
    }

    // ── Admin — Revenue ──────────────────────────────────────────────── //

    /** Null-safe: returns pricePaid if set and positive, else fallback. */
    private static long effectivePaid(Ticket t) {
        Integer pp = t.getPricePaid();
        if (pp != null && pp > 0) return pp;
        return t.getTrain() != null ? t.getTrain().getPricePerSeat() : 0;
    }

    public Map<String, Object> getRevenueStats() {
        List<Ticket> all    = ticketRepository.findAll();
        List<Train>  trains = trainService.getAllTrains();
        String today        = LocalDate.now().toString();

        // ── Core revenue — use pricePaid (reflects discounts) ────────────
        long totalRevenue = all.stream().mapToLong(UserBookingService::effectivePaid).sum();

        // ── Discount given out via promo codes ───────────────────────────
        long discountTotal = all.stream().filter(t -> t.getTrain() != null).mapToLong(t -> {
            int base = t.getTrain().getPriceForRow(t.getSeatRow());
            long paid = effectivePaid(t);
            return Math.max(0, base - paid);
        }).sum();

        // ── Revenue by train (trainId → total, using pricePaid) ──────────
        Map<String, Long>   revenueByTrain = new LinkedHashMap<>();
        Map<String, String> trainNames     = new LinkedHashMap<>();
        for (Train tr : trains) {
            revenueByTrain.put(tr.getTrainId(), 0L);
            trainNames.put(tr.getTrainId(), tr.getName());
        }
        all.stream().filter(t -> t.getTrain() != null).forEach(t -> {
            String tid = t.getTrain().getTrainId();
            long paid  = effectivePaid(t);
            revenueByTrain.merge(tid, paid, Long::sum);
        });

        // ── Revenue by fare class ────────────────────────────────────────
        Map<String, Long> revenueByFareClass = new LinkedHashMap<>();
        revenueByFareClass.put("ECONOMY",  0L);
        revenueByFareClass.put("BUSINESS", 0L);
        revenueByFareClass.put("FIRST",    0L);
        Map<String, Long> bookingsByFareClass = new LinkedHashMap<>();
        bookingsByFareClass.put("ECONOMY",  0L);
        bookingsByFareClass.put("BUSINESS", 0L);
        bookingsByFareClass.put("FIRST",    0L);
        all.forEach(t -> {
            String fc   = t.getFareClass() != null ? t.getFareClass() : "ECONOMY";
            long   paid = effectivePaid(t);
            revenueByFareClass.merge(fc, paid, Long::sum);
            bookingsByFareClass.merge(fc, 1L, Long::sum);
        });

        // ── Occupancy per train ──────────────────────────────────────────
        Map<String, Map<String, Object>> occupancy = new LinkedHashMap<>();
        for (Train tr : trains) {
            int total  = tr.getSeats() != null ? tr.getSeats().size() * 4 : 0;
            int booked = tr.getSeats() != null
                    ? (int) tr.getSeats().stream().flatMap(Collection::stream).filter(v -> v == 1).count() : 0;
            Map<String, Object> occ = new LinkedHashMap<>();
            occ.put("booked", booked);
            occ.put("total",  total);
            occ.put("pct",    total == 0 ? 0 : (booked * 100 / total));
            occupancy.put(tr.getTrainId(), occ);
        }

        // ── Bookings per day (travel date, last 7 days) ──────────────────
        Map<String, Long> perDay = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) perDay.put(LocalDate.now().minusDays(i).toString(), 0L);
        all.forEach(t -> {
            if (t.getDateOfTravel() != null && perDay.containsKey(t.getDateOfTravel()))
                perDay.merge(t.getDateOfTravel(), 1L, Long::sum);
        });

        // ── Past / upcoming split ────────────────────────────────────────
        long pastBookings     = all.stream().filter(t -> t.getDateOfTravel() != null
                && t.getDateOfTravel().compareTo(today) < 0).count();
        long upcomingBookings = all.stream().filter(t -> t.getDateOfTravel() != null
                && t.getDateOfTravel().compareTo(today) >= 0).count();

        // ── Promo code stats ─────────────────────────────────────────────
        List<Map<String, Object>> promoStats = promoCodeRepository.findAll().stream()
                .map(pc -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("code",          pc.getCode());
                    m.put("discountPct",   pc.getDiscountPercent());
                    m.put("usedCount",     pc.getUsedCount());
                    m.put("maxUses",       pc.getMaxUses());
                    m.put("expiresAt",     pc.getExpiresAt());
                    m.put("active",        pc.isActive());
                    return m;
                }).collect(Collectors.toList());

        // ── Waitlist stats ───────────────────────────────────────────────
        List<WaitlistEntry> waitlist    = waitlistRepository.findAll();
        long waitlistTotal              = waitlist.stream().filter(w -> "WAITING".equals(w.getStatus())).count();
        Map<String, Long> waitlistByTrain = new LinkedHashMap<>();
        waitlist.stream().filter(w -> "WAITING".equals(w.getStatus())).forEach(w ->
                waitlistByTrain.merge(w.getTrainId(), 1L, Long::sum));

        // ── Top 5 passengers by total spend ─────────────────────────────
        Map<String, Long>   spendByUser = new LinkedHashMap<>();
        Map<String, Long>   countByUser = new LinkedHashMap<>();
        Map<String, String> nameByUser  = new LinkedHashMap<>();
        all.forEach(t -> {
            String uid  = t.getUserId();
            if (uid == null) return;
            long   paid = effectivePaid(t);
            spendByUser.merge(uid, paid, Long::sum);
            countByUser.merge(uid, 1L,   Long::sum);
            if (!nameByUser.containsKey(uid) && t.getPassengerName() != null && !t.getPassengerName().isBlank())
                nameByUser.put(uid, t.getPassengerName());
        });
        // Fill missing names from user repo
        spendByUser.keySet().forEach(uid -> nameByUser.computeIfAbsent(uid, id ->
                userRepository.findById(id).map(u -> u.getFirstName() != null && !u.getFirstName().isBlank()
                        ? u.getFirstName() + " " + (u.getLastName() != null ? u.getLastName() : "")
                        : u.getName()).orElse(id)));

        List<Map<String, Object>> topPassengers = spendByUser.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("userId",       e.getKey());
                    m.put("name",         nameByUser.getOrDefault(e.getKey(), e.getKey()));
                    m.put("totalSpend",   e.getValue());
                    m.put("bookingCount", countByUser.getOrDefault(e.getKey(), 0L));
                    return m;
                }).collect(Collectors.toList());

        // ── Assemble response ────────────────────────────────────────────
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRevenue",       totalRevenue);
        stats.put("discountTotal",      discountTotal);
        stats.put("totalBookings",      all.size());
        stats.put("upcomingBookings",   upcomingBookings);
        stats.put("pastBookings",       pastBookings);
        stats.put("totalUsers",         userRepository.count());
        stats.put("totalTrains",        trains.size());
        stats.put("waitlistTotal",      waitlistTotal);
        stats.put("revenueByTrain",     revenueByTrain);
        stats.put("trainNames",         trainNames);
        stats.put("revenueByFareClass", revenueByFareClass);
        stats.put("bookingsByFareClass",bookingsByFareClass);
        stats.put("occupancy",          occupancy);
        stats.put("bookingsPerDay",     perDay);
        stats.put("promoStats",         promoStats);
        stats.put("waitlistByTrain",    waitlistByTrain);
        stats.put("topPassengers",      topPassengers);
        return stats;
    }

    // ── Admin — Announcements ────────────────────────────────────────── //

    public List<Announcement> getActiveAnnouncements()  { return announcementRepository.findByActiveTrue(); }
    public List<Announcement> getAllAnnouncements()      { return announcementRepository.findAll(); }

    public Announcement createAnnouncement(String message, String type) {
        Announcement a = new Announcement(UUID.randomUUID().toString(), message, type,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        return announcementRepository.save(a);
    }

    public boolean toggleAnnouncement(String id, boolean active) {
        return announcementRepository.findById(id).map(a -> {
            a.setActive(active); announcementRepository.save(a); return true;
        }).orElse(false);
    }

    public boolean deleteAnnouncement(String id) {
        if (!announcementRepository.existsById(id)) return false;
        announcementRepository.deleteById(id); return true;
    }

    // ── Admin — Promo Codes ──────────────────────────────────────────── //

    public List<PromoCode> getAllPromoCodes()            { return promoCodeRepository.findAll(); }

    public PromoCode createPromoCode(String code, int discountPercent, int maxUses, String expiresAt) {
        PromoCode pc = new PromoCode(code, discountPercent, maxUses, expiresAt);
        return promoCodeRepository.save(pc);
    }

    public boolean deletePromoCode(String code) {
        if (!promoCodeRepository.existsById(code.toUpperCase())) return false;
        promoCodeRepository.deleteById(code.toUpperCase()); return true;
    }

    /** Validates a promo code and returns discount percent, or -1 if invalid/expired/exhausted */
    public int validatePromoCode(String code) {
        return promoCodeRepository.findByCodeIgnoreCaseAndActiveTrue(code).map(pc -> {
            if (pc.getUsedCount() >= pc.getMaxUses()) return -1;
            if (pc.getExpiresAt() != null && pc.getExpiresAt().compareTo(LocalDate.now().toString()) < 0) return -1;
            return pc.getDiscountPercent();
        }).orElse(-1);
    }

    /** Call after a successful booking that used a promo code */
    @Transactional
    public void incrementPromoUsage(String code) {
        promoCodeRepository.findByCodeIgnoreCaseAndActiveTrue(code).ifPresent(pc -> {
            pc.setUsedCount(pc.getUsedCount() + 1);
            promoCodeRepository.save(pc);
        });
    }
}
