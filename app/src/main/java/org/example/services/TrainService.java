package org.example.services;

import org.example.entities.Train;
import org.example.repositories.TrainRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainService {

    private final TrainRepository trainRepository;

    public TrainService(TrainRepository trainRepository) {
        this.trainRepository = trainRepository;
    }

    public List<Train> searchTrains(String source, String destination) {
        String srcLower  = source.toLowerCase();
        String destLower = destination.toLowerCase();

        return trainRepository.findAll().stream()
                .filter(t -> isValidRoute(t, srcLower, destLower))
                .collect(Collectors.toList());
    }

    public Set<String> getAllStations() {
        Set<String> stations = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        trainRepository.findAll().forEach(t -> stations.addAll(t.getStations()));
        return stations;
    }

    public Optional<Train> getTrainById(String trainId) {
        return trainRepository.findById(trainId);
    }

    public Train saveTrain(Train train) {
        return trainRepository.save(train);
    }

    public List<Train> getAllTrains() {
        return trainRepository.findAll();
    }

    public void deleteTrain(String trainId) {
        trainRepository.deleteById(trainId);
    }

    private boolean isValidRoute(Train train, String source, String destination) {
        List<String> order = train.getStations().stream()
                .map(String::toLowerCase)
                .collect(Collectors.toList());
        int si = findMatchIndex(order, source);
        int di = findMatchIndex(order, destination);
        return si != -1 && di != -1 && si < di;
    }

    /**
     * Finds the first station index that matches the query.
     * Priority: exact → station starts with query → station contains query → query contains station.
     */
    private int findMatchIndex(List<String> stations, String query) {
        if (query == null || query.isBlank()) return -1;
        String q = query.trim();
        // 1. Exact
        int exact = stations.indexOf(q);
        if (exact != -1) return exact;
        // 2. Station starts with query  ("new york" → "new york penn")
        for (int i = 0; i < stations.size(); i++) {
            if (stations.get(i).startsWith(q)) return i;
        }
        // 3. Station contains query  ("york" → "new york penn")
        for (int i = 0; i < stations.size(); i++) {
            if (stations.get(i).contains(q)) return i;
        }
        // 4. Query contains station  ("new york penn station" → "new york penn")
        for (int i = 0; i < stations.size(); i++) {
            if (q.contains(stations.get(i))) return i;
        }
        return -1;
    }
}
