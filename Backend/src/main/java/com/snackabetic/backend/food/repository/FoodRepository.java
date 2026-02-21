package com.snackabetic.backend.food.repository;

import com.snackabetic.backend.food.entity.Food;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodRepository extends JpaRepository<Food, Long> {

    Page<Food> findByNameContainingIgnoreCase(String name, Pageable pageable);

    boolean existsByNameAndBrand(String name, String brand);
}
