package com.snackabetic.backend.meal.dto;

import com.snackabetic.backend.meal.entity.Meal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealResponse {

    private Long id;
    private Long patientProfileId;
    private LocalDateTime mealTime;
    private String mealType;
    private BigDecimal totalCarbsG;
    private BigDecimal totalCalories;
    private String photoUrl;
    private String notes;
    private List<MealItemResponse> items;
    private LocalDateTime createdAt;

    public static MealResponse from(Meal meal) {
        return MealResponse.builder()
                .id(meal.getId())
                .patientProfileId(meal.getPatientProfileId())
                .mealTime(meal.getMealTime())
                .mealType(meal.getMealType())
                .totalCarbsG(meal.getTotalCarbsG())
                .totalCalories(meal.getTotalCalories())
                .photoUrl(meal.getPhotoUrl())
                .notes(meal.getNotes())
                .items(meal.getItems() != null
                        ? meal.getItems().stream()
                                .map(MealItemResponse::from)
                                .collect(Collectors.toList())
                        : List.of())
                .createdAt(meal.getCreatedAt())
                .build();
    }
}
