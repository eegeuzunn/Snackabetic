package com.snackabetic.backend.glucose.repository;

import com.snackabetic.backend.glucose.entity.GlucoseReading;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface GlucoseReadingRepository extends JpaRepository<GlucoseReading, Long> {

    Page<GlucoseReading> findByPatientProfileIdOrderByReadingTimeDesc(Long patientProfileId, Pageable pageable);

    List<GlucoseReading> findByPatientProfileIdAndReadingTimeBetweenOrderByReadingTimeAsc(
            Long patientProfileId, LocalDateTime start, LocalDateTime end);
}
