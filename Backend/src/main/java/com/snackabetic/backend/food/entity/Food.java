package com.snackabetic.backend.food.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "foods")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Food {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String brand;

    @Column(name = "carbs_per_100g", nullable = false, precision = 6, scale = 2)
    private BigDecimal carbsPer100g;

    @Column(name = "protein_per_100g", precision = 6, scale = 2)
    private BigDecimal proteinPer100g;

    @Column(name = "fat_per_100g", precision = 6, scale = 2)
    private BigDecimal fatPer100g;

    @Column(name = "fiber_per_100g", precision = 6, scale = 2)
    private BigDecimal fiberPer100g;

    @Column(name = "calories_per_100g", precision = 7, scale = 2)
    private BigDecimal caloriesPer100g;

    @Column(length = 50)
    private String source;

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
