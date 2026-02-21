package com.snackabetic.backend.insulin.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "insulin_doses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InsulinDose {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_profile_id", nullable = false)
    private Long patientProfileId;

    @Column(name = "dose_time", nullable = false)
    private LocalDateTime doseTime;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal units;

    @Column(name = "insulin_type", nullable = false, length = 20)
    private String insulinType;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
