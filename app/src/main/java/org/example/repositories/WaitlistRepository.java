package org.example.repositories;

import org.example.entities.WaitlistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WaitlistRepository extends JpaRepository<WaitlistEntry, String> {
    List<WaitlistEntry> findByTrainIdAndDateOfTravelAndStatusOrderByCreatedAtAsc(
            String trainId, String dateOfTravel, String status);
    List<WaitlistEntry> findByUserIdOrderByCreatedAtDesc(String userId);
    boolean existsByUserIdAndTrainIdAndDateOfTravelAndStatus(
            String userId, String trainId, String dateOfTravel, String status);
}
