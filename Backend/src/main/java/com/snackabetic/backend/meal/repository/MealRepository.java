package com.snackabetic.backend.meal.repository;

import com.snackabetic.backend.meal.entity.Meal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MealRepository extends JpaRepository<Meal, Long> {

    Page<Meal> findByPatientProfileIdOrderByMealTimeDesc(Long patientProfileId, Pageable pageable);

    List<Meal> findByPatientProfileIdAndMealTimeBetweenOrderByMealTimeAsc(
            Long patientProfileId, LocalDateTime start, LocalDateTime end);
}
