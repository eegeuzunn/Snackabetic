package com.snackabetic.backend.food.dto;

import com.snackabetic.backend.food.entity.Food;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodResponse {

    private Long id;
    private String name;
    private String brand;
    private BigDecimal carbsPer100g;
    private BigDecimal proteinPer100g;
    private BigDecimal fatPer100g;
    private BigDecimal fiberPer100g;
    private BigDecimal caloriesPer100g;
    private String source;

    public static FoodResponse from(Food food) {
        return FoodResponse.builder()
                .id(food.getId())
                .name(food.getName())
                .brand(food.getBrand())
                .carbsPer100g(food.getCarbsPer100g())
                .proteinPer100g(food.getProteinPer100g())
                .fatPer100g(food.getFatPer100g())
                .fiberPer100g(food.getFiberPer100g())
                .caloriesPer100g(food.getCaloriesPer100g())
                .source(food.getSource())
                .build();
    }
}
