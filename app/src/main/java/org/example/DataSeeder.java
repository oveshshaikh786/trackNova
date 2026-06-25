package org.example;

import org.example.entities.Train;
import org.example.entities.User;
import org.example.repositories.TrainRepository;
import org.example.repositories.UserRepository;
import org.example.util.UserServiceUtil;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Seeds the database with initial data on first boot.
 * Safe to run multiple times — checks before inserting.
 */
@Component
public class DataSeeder {

    private final TrainRepository trainRepository;
    private final UserRepository  userRepository;

    public DataSeeder(TrainRepository trainRepository, UserRepository userRepository) {
        this.trainRepository = trainRepository;
        this.userRepository  = userRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        seedTrains();
        seedAdminUser();
        long total = trainRepository.count();
        System.out.println("===========================================");
        System.out.println("[TrackNova] DB ready. Total trains: " + total);
        System.out.println("===========================================");
    }

    // ------------------------------------------------------------------
    //  Trains
    // ------------------------------------------------------------------

    private void seedTrains() {
        // Add each train individually so new routes appear even on existing DBs
        List<Train> toAdd = new ArrayList<>();

        if (!trainRepository.existsById("AMT-101"))
            toAdd.add(makeTrain("AMT-101", "NER-2150", "Northeast Regional", 45,
                List.of("New York Penn", "Philadelphia", "Baltimore", "Washington DC"),
                Map.of("New York Penn","06:00","Philadelphia","07:35","Baltimore","09:00","Washington DC","10:05")));

        if (!trainRepository.existsById("AMT-102"))
            toAdd.add(makeTrain("AMT-102", "ACE-2200", "Acela Express", 110,
                List.of("Boston South", "New York Penn", "Philadelphia", "Washington DC"),
                Map.of("Boston South","05:45","New York Penn","08:00","Philadelphia","09:20","Washington DC","10:35")));

        if (!trainRepository.existsById("AMT-103"))
            toAdd.add(makeTrain("AMT-103", "CZR-5", "California Zephyr", 130,
                List.of("Chicago Union", "Denver", "Salt Lake City", "San Francisco"),
                Map.of("Chicago Union","14:00","Denver","07:45","Salt Lake City","16:30","San Francisco","16:10")));

        if (!trainRepository.existsById("AMT-104"))
            toAdd.add(makeTrain("AMT-104", "EMB-7", "Empire Builder", 95,
                List.of("Chicago Union", "Milwaukee", "Minneapolis", "Seattle King St"),
                Map.of("Chicago Union","14:15","Milwaukee","15:55","Minneapolis","22:10","Seattle King St","07:40")));

        if (!trainRepository.existsById("AMT-105"))
            toAdd.add(makeTrain("AMT-105", "SSL-1", "Silver Star", 75,
                List.of("New York Penn", "Philadelphia", "Raleigh", "Orlando", "Miami"),
                Map.of("New York Penn","07:15","Philadelphia","08:50","Raleigh","14:05","Orlando","23:30","Miami","02:55")));

        // ── New Routes ───────────────────────────────────────────────────

        if (!trainRepository.existsById("AMT-106"))
            toAdd.add(makeTrain("AMT-106", "LSL-48", "Lake Shore Limited", 85,
                List.of("New York Penn", "Albany", "Buffalo", "Cleveland", "Toledo", "Chicago Union"),
                new LinkedHashMap<>(Map.of("New York Penn","15:45","Albany","19:00","Buffalo","23:29","Cleveland","04:50","Toledo","06:45","Chicago Union","09:45"))));

        if (!trainRepository.existsById("AMT-107"))
            toAdd.add(makeTrain("AMT-107", "CRD-51", "Cardinal", 90,
                List.of("New York Penn", "Philadelphia", "Washington DC", "Cincinnati", "Indianapolis", "Chicago Union"),
                new LinkedHashMap<>(Map.of("New York Penn","06:45","Philadelphia","08:15","Washington DC","10:05","Cincinnati","20:50","Indianapolis","01:20","Chicago Union","08:45"))));

        if (!trainRepository.existsById("AMT-108"))
            toAdd.add(makeTrain("AMT-108", "CRS-19", "Crescent", 95,
                List.of("New York Penn", "Philadelphia", "Washington DC", "Charlotte", "Atlanta", "New Orleans"),
                new LinkedHashMap<>(Map.of("New York Penn","14:15","Philadelphia","15:50","Washington DC","19:05","Charlotte","02:14","Atlanta","09:06","New Orleans","19:46"))));

        if (!trainRepository.existsById("AMT-109"))
            toAdd.add(makeTrain("AMT-109", "SXL-2", "Sunset Limited", 120,
                List.of("New Orleans", "Houston", "San Antonio", "El Paso", "Tucson", "Los Angeles"),
                new LinkedHashMap<>(Map.of("New Orleans","14:00","Houston","22:05","San Antonio","06:50","El Paso","21:05","Tucson","02:10","Los Angeles","09:10"))));

        if (!trainRepository.existsById("AMT-110"))
            toAdd.add(makeTrain("AMT-110", "SWC-3", "Southwest Chief", 105,
                List.of("Chicago Union", "Kansas City", "Albuquerque", "Flagstaff", "Los Angeles"),
                new LinkedHashMap<>(Map.of("Chicago Union","15:00","Kansas City","21:49","Albuquerque","13:10","Flagstaff","18:55","Los Angeles","08:15"))));

        if (!trainRepository.existsById("AMT-111"))
            toAdd.add(makeTrain("AMT-111", "CON-58", "City of New Orleans", 70,
                List.of("Chicago Union", "Memphis", "Jackson", "New Orleans"),
                new LinkedHashMap<>(Map.of("Chicago Union","20:05","Memphis","06:00","Jackson","09:00","New Orleans","14:00"))));

        if (!trainRepository.existsById("AMT-112"))
            toAdd.add(makeTrain("AMT-112", "PLM-89", "Palmetto", 65,
                List.of("New York Penn", "Philadelphia", "Baltimore", "Raleigh", "Savannah", "Jacksonville"),
                new LinkedHashMap<>(Map.of("New York Penn","07:25","Philadelphia","08:55","Baltimore","10:25","Raleigh","15:58","Savannah","22:30","Jacksonville","00:55"))));

        if (!trainRepository.existsById("AMT-113"))
            toAdd.add(makeTrain("AMT-113", "TEX-22", "Texas Eagle", 80,
                List.of("Chicago Union", "St. Louis", "Little Rock", "Dallas", "San Antonio"),
                new LinkedHashMap<>(Map.of("Chicago Union","14:00","St. Louis","22:35","Little Rock","06:05","Dallas","15:57","San Antonio","07:58"))));

        if (!trainRepository.existsById("AMT-114"))
            toAdd.add(makeTrain("AMT-114", "PKF-14", "Pacific Surfliner", 55,
                List.of("San Luis Obispo", "Los Angeles", "San Diego"),
                new LinkedHashMap<>(Map.of("San Luis Obispo","06:05","Los Angeles","10:55","San Diego","13:50"))));

        if (!trainRepository.existsById("AMT-115"))
            toAdd.add(makeTrain("AMT-115", "CAP-29", "Capitol Corridor", 50,
                List.of("San Jose", "Oakland", "Sacramento", "Reno"),
                new LinkedHashMap<>(Map.of("San Jose","06:00","Oakland","07:15","Sacramento","09:35","Reno","13:45"))));

        if (!trainRepository.existsById("AMT-116"))
            toAdd.add(makeTrain("AMT-116", "HWK-77", "Hawkeye", 60,
                List.of("Chicago Union", "Milwaukee", "Columbus", "Pittsburgh", "New York Penn"),
                new LinkedHashMap<>(Map.of("Chicago Union","08:00","Milwaukee","09:40","Columbus","14:55","Pittsburgh","18:10","New York Penn","23:59"))));

        if (!trainRepository.existsById("AMT-117"))
            toAdd.add(makeTrain("AMT-117", "DXE-35", "Dixie Flyer", 72,
                List.of("Atlanta", "Nashville", "Louisville", "Cincinnati", "Cleveland", "Detroit"),
                new LinkedHashMap<>(Map.of("Atlanta","07:00","Nashville","11:45","Louisville","14:30","Cincinnati","16:20","Cleveland","19:45","Detroit","22:10"))));

        if (!trainRepository.existsById("AMT-118"))
            toAdd.add(makeTrain("AMT-118", "SEA-12", "Seaboard Express", 88,
                List.of("Miami", "Tampa", "Orlando", "Savannah", "Charlotte", "Richmond", "Washington DC"),
                new LinkedHashMap<>(Map.of("Miami","08:00","Tampa","10:15","Orlando","12:30","Savannah","18:45","Charlotte","23:00","Richmond","02:30","Washington DC","04:45"))));

        if (!trainRepository.existsById("AMT-119"))
            toAdd.add(makeTrain("AMT-119", "MNT-61", "Mountain Express", 115,
                List.of("Denver", "Colorado Springs", "Albuquerque", "Phoenix", "Tucson"),
                new LinkedHashMap<>(Map.of("Denver","07:00","Colorado Springs","08:15","Albuquerque","13:45","Phoenix","19:30","Tucson","21:00"))));

        if (!trainRepository.existsById("AMT-120"))
            toAdd.add(makeTrain("AMT-120", "GLC-44", "Great Lakes Circuit", 68,
                List.of("Detroit", "Toledo", "Cleveland", "Buffalo", "Rochester", "Syracuse", "Albany"),
                new LinkedHashMap<>(Map.of("Detroit","06:30","Toledo","08:10","Cleveland","10:00","Buffalo","13:20","Rochester","14:45","Syracuse","16:00","Albany","18:30"))));

        // ── Transcontinental & Long-Distance ────────────────────────────

        // New York → Seattle (full cross-country northwest corridor)
        if (!trainRepository.existsById("AMT-121"))
            toAdd.add(makeTrain("AMT-121", "NSX-1", "North Star Express", 145,
                List.of("New York Penn", "Albany", "Buffalo", "Cleveland", "Chicago Union", "Minneapolis", "Seattle King St"),
                new LinkedHashMap<>(Map.of("New York Penn","08:00","Albany","10:30","Buffalo","14:15","Cleveland","17:45","Chicago Union","22:00","Minneapolis","04:30","Seattle King St","18:00"))));

        // New York → Los Angeles (southern transcontinental)
        if (!trainRepository.existsById("AMT-122"))
            toAdd.add(makeTrain("AMT-122", "STC-7", "Southern Transcontinental", 160,
                List.of("New York Penn", "Washington DC", "Atlanta", "New Orleans", "Houston", "Dallas", "El Paso", "Los Angeles"),
                new LinkedHashMap<>(Map.of("New York Penn","07:00","Washington DC","10:05","Atlanta","19:30","New Orleans","05:00","Houston","12:00","Dallas","17:30","El Paso","06:00","Los Angeles","18:00"))));

        // Seattle → Los Angeles (west coast)
        if (!trainRepository.existsById("AMT-123"))
            toAdd.add(makeTrain("AMT-123", "PCL-11", "Pacific Coast Limited", 90,
                List.of("Seattle King St", "Portland", "Sacramento", "Oakland", "San Francisco", "Los Angeles"),
                new LinkedHashMap<>(Map.of("Seattle King St","10:00","Portland","13:45","Sacramento","21:30","Oakland","23:15","San Francisco","23:59","Los Angeles","09:10"))));

        // New York → Chicago (direct midwest link)
        if (!trainRepository.existsById("AMT-124"))
            toAdd.add(makeTrain("AMT-124", "LKX-33", "Lakeshore Express", 75,
                List.of("New York Penn", "Philadelphia", "Pittsburgh", "Columbus", "Indianapolis", "Chicago Union"),
                new LinkedHashMap<>(Map.of("New York Penn","06:30","Philadelphia","08:00","Pittsburgh","12:10","Columbus","15:40","Indianapolis","18:20","Chicago Union","21:45"))));

        // Chicago → San Francisco (central corridor)
        if (!trainRepository.existsById("AMT-125"))
            toAdd.add(makeTrain("AMT-125", "WXP-9", "Western Express", 120,
                List.of("Chicago Union", "Kansas City", "Denver", "Salt Lake City", "Reno", "San Francisco"),
                new LinkedHashMap<>(Map.of("Chicago Union","14:00","Kansas City","19:30","Denver","07:00","Salt Lake City","14:45","Reno","22:00","San Francisco","06:30"))));

        // Miami → Seattle (full East-to-Northwest)
        if (!trainRepository.existsById("AMT-126"))
            toAdd.add(makeTrain("AMT-126", "CNT-2", "Continental", 185,
                List.of("Miami", "Atlanta", "Nashville", "Chicago Union", "Minneapolis", "Billings", "Seattle King St"),
                new LinkedHashMap<>(Map.of("Miami","06:00","Atlanta","13:30","Nashville","18:00","Chicago Union","22:30","Minneapolis","04:45","Billings","14:00","Seattle King St","22:30"))));

        // Washington DC → Seattle
        if (!trainRepository.existsById("AMT-127"))
            toAdd.add(makeTrain("AMT-127", "NWC-5", "Northwest Corridor", 135,
                List.of("Washington DC", "Pittsburgh", "Cleveland", "Chicago Union", "Milwaukee", "St. Paul", "Seattle King St"),
                new LinkedHashMap<>(Map.of("Washington DC","07:00","Pittsburgh","11:30","Cleveland","14:15","Chicago Union","18:00","Milwaukee","19:40","St. Paul","01:30","Seattle King St","16:00"))));

        // Boston → Los Angeles
        if (!trainRepository.existsById("AMT-128"))
            toAdd.add(makeTrain("AMT-128", "TRN-88", "Transcontinental", 175,
                List.of("Boston South", "New York Penn", "Washington DC", "Charlotte", "Atlanta", "Dallas", "Albuquerque", "Los Angeles"),
                new LinkedHashMap<>(Map.of("Boston South","06:00","New York Penn","08:30","Washington DC","11:00","Charlotte","18:00","Atlanta","22:30","Dallas","09:00","Albuquerque","18:30","Los Angeles","06:00"))));

        if (!toAdd.isEmpty()) {
            trainRepository.saveAll(toAdd);
            System.out.println("[DataSeeder] Seeded " + toAdd.size() + " new trains.");
        }
    }

    private Train makeTrain(String id, String no, String name, int price,
                             List<String> stations, Map<String, String> times) {
        // 10 rows × 4 seats, all available (0)
        List<List<Integer>> seats = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            seats.add(new ArrayList<>(Arrays.asList(0, 0, 0, 0)));
        }
        return new Train(id, no, name, price, seats, times, stations);
    }

    // ------------------------------------------------------------------
    //  Admin user (username: admin, password: admin123)
    // ------------------------------------------------------------------

    private void seedAdminUser() {
        if (userRepository.existsByName("admin")) return;

        User admin = new User();
        admin.setUserId(UUID.randomUUID().toString());
        admin.setName("admin");
        admin.setHashedPassword(UserServiceUtil.hashPassword("admin123"));
        admin.setRole("ADMIN");
        admin.setFirstName("Admin");
        admin.setLastName("User");
        userRepository.save(admin);
        System.out.println("[DataSeeder] Created admin user (username: admin, password: admin123)");
    }
}
