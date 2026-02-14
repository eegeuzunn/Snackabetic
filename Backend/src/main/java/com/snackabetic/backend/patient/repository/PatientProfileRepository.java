package com.snackabetic.backend.patient.repository;

import com.snackabetic.backend.patient.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {

    Optional<PatientProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
