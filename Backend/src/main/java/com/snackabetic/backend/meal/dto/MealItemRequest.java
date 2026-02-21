package com.snackabetic.backend.meal.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealItemRequest {

    @NotNull(message = "Yiyecek ID zorunludur")
    private Long foodId;

    @NotNull(message = "Miktar (gram) zorunludur")
    @Positive(message = "Miktar pozitif olmalıdır")
    private BigDecimal amountGrams;
}
