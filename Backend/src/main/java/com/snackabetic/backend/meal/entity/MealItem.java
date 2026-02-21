package com.snackabetic.backend.meal.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "meal_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_id", nullable = false)
    @JsonIgnore
    private Meal meal;

    @Column(name = "food_id", nullable = false)
    private Long foodId;

    @Column(name = "amount_grams", nullable = false, precision = 7, scale = 2)
    private BigDecimal amountGrams;

    @Column(name = "carbs_g", precision = 7, scale = 2)
    private BigDecimal carbsG;

    @Column(precision = 8, scale = 2)
    private BigDecimal calories;
}
