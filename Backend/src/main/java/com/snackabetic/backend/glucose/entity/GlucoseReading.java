package com.snackabetic.backend.glucose.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "glucose_readings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlucoseReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_profile_id", nullable = false)
    private Long patientProfileId;

    @Column(nullable = false)
    private LocalDateTime readingTime;

    @Column(name = "value_mg_dl", nullable = false)
    private Integer valueMgDl;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(length = 20)
    private String tag;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
