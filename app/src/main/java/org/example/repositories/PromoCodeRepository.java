package org.example.repositories;

import org.example.entities.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PromoCodeRepository extends JpaRepository<PromoCode, String> {
    Optional<PromoCode> findByCodeIgnoreCaseAndActiveTrue(String code);
}
