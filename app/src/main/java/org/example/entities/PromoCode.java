package org.example.entities;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "promo_codes")
@Getter @Setter @NoArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PromoCode {
    @Id
    @Column(name = "code")
    private String code;

    @Column(name = "discount_percent", nullable = false)
    private int discountPercent;

    @Column(name = "max_uses", nullable = false)
    private int maxUses = 100;

    @Column(name = "used_count", nullable = false)
    private int usedCount = 0;

    /** "YYYY-MM-DD" or null = never expires */
    @Column(name = "expires_at")
    private String expiresAt;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public PromoCode(String code, int discountPercent, int maxUses, String expiresAt) {
        this.code = code.toUpperCase();
        this.discountPercent = discountPercent;
        this.maxUses = maxUses;
        this.usedCount = 0;
        this.expiresAt = expiresAt;
        this.active = true;
    }
}
