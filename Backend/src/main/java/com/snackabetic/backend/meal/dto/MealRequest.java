package com.snackabetic.backend.meal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MealRequest {

    @NotNull(message = "Öğün zamanı zorunludur")
    private LocalDateTime mealTime;

    @NotBlank(message = "Öğün tipi zorunludur")
    private String mealType;

    private String photoUrl;
    private String notes;

    @Valid
    private List<MealItemRequest> items;
}
