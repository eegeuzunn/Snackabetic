package com.snackabetic.backend.meal.dto;

import com.snackabetic.backend.meal.entity.MealItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealItemResponse {

    private Long id;
    private Long foodId;
    private BigDecimal amountGrams;
    private BigDecimal carbsG;
    private BigDecimal calories;

    public static MealItemResponse from(MealItem item) {
        return MealItemResponse.builder()
                .id(item.getId())
                .foodId(item.getFoodId())
                .amountGrams(item.getAmountGrams())
                .carbsG(item.getCarbsG())
                .calories(item.getCalories())
                .build();
    }
}
