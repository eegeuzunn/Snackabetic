package com.snackabetic.backend.meal.repository;

import com.snackabetic.backend.meal.entity.MealItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealItemRepository extends JpaRepository<MealItem, Long> {
}
