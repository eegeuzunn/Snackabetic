package com.snackabetic.backend.patient.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    private LocalDate dateOfBirth;

    @Column(length = 10)
    private String sex;

    @Column(precision = 5, scale = 2)
    private BigDecimal heightCm;

    @Column(precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(length = 20)
    private String diabetesType;

    private LocalDate diagnosisDate;

    private Integer targetGlucoseMin;

    private Integer targetGlucoseMax;

    @Column(precision = 6, scale = 2)
    private BigDecimal carbRatio;

    @Column(precision = 6, scale = 2)
    private BigDecimal correctionFactor;

    @Column(length = 100)
    private String timezone;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
