package com.snackabetic.backend.insulin.repository;

import com.snackabetic.backend.insulin.entity.InsulinDose;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface InsulinDoseRepository extends JpaRepository<InsulinDose, Long> {

    Page<InsulinDose> findByPatientProfileIdOrderByDoseTimeDesc(Long patientProfileId, Pageable pageable);

    List<InsulinDose> findByPatientProfileIdAndDoseTimeBetweenOrderByDoseTimeAsc(
            Long patientProfileId, LocalDateTime start, LocalDateTime end);
}
