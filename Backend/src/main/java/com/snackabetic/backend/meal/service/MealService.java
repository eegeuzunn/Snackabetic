package com.snackabetic.backend.meal.service;

import com.snackabetic.backend.common.exception.ResourceNotFoundException;
import com.snackabetic.backend.food.entity.Food;
import com.snackabetic.backend.food.repository.FoodRepository;
import com.snackabetic.backend.meal.dto.MealItemRequest;
import com.snackabetic.backend.meal.dto.MealRequest;
import com.snackabetic.backend.meal.dto.MealResponse;
import com.snackabetic.backend.meal.entity.Meal;
import com.snackabetic.backend.meal.entity.MealItem;
import com.snackabetic.backend.meal.repository.MealRepository;
import com.snackabetic.backend.patient.service.PatientProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealService {

    private final MealRepository mealRepository;
    private final FoodRepository foodRepository;
    private final PatientProfileService patientProfileService;

    @Transactional
    public MealResponse create(String email, MealRequest request) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        Meal meal = Meal.builder()
                .patientProfileId(profileId)
                .mealTime(request.getMealTime())
                .mealType(request.getMealType())
                .photoUrl(request.getPhotoUrl())
                .notes(request.getNotes())
                .build();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (MealItemRequest itemReq : request.getItems()) {
                MealItem item = buildMealItem(itemReq);
                meal.addItem(item);
            }
            calculateTotals(meal);
        }

        meal = mealRepository.save(meal);
        return MealResponse.from(meal);
    }

    public MealResponse getById(String email, Long mealId) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Öğün", mealId));

        if (!meal.getPatientProfileId().equals(profileId)) {
            throw new ResourceNotFoundException("Öğün", mealId);
        }

        return MealResponse.from(meal);
    }

    public Page<MealResponse> getMyMeals(String email, Pageable pageable) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        return mealRepository.findByPatientProfileIdOrderByMealTimeDesc(profileId, pageable)
                .map(MealResponse::from);
    }

    public List<MealResponse> getByDate(String email, LocalDate date) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        return mealRepository.findByPatientProfileIdAndMealTimeBetweenOrderByMealTimeAsc(profileId, start, end)
                .stream()
                .map(MealResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(String email, Long mealId) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Öğün", mealId));

        if (!meal.getPatientProfileId().equals(profileId)) {
            throw new ResourceNotFoundException("Öğün", mealId);
        }

        mealRepository.delete(meal);
    }

    private MealItem buildMealItem(MealItemRequest request) {
        Food food = foodRepository.findById(request.getFoodId())
                .orElseThrow(() -> new ResourceNotFoundException("Yiyecek", request.getFoodId()));

        BigDecimal ratio = request.getAmountGrams()
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        BigDecimal carbsG = food.getCarbsPer100g() != null
                ? food.getCarbsPer100g().multiply(ratio).setScale(2, RoundingMode.HALF_UP)
                : null;

        BigDecimal calories = food.getCaloriesPer100g() != null
                ? food.getCaloriesPer100g().multiply(ratio).setScale(2, RoundingMode.HALF_UP)
                : null;

        return MealItem.builder()
                .foodId(food.getId())
                .amountGrams(request.getAmountGrams())
                .carbsG(carbsG)
                .calories(calories)
                .build();
    }

    private void calculateTotals(Meal meal) {
        BigDecimal totalCarbs = BigDecimal.ZERO;
        BigDecimal totalCalories = BigDecimal.ZERO;

        for (MealItem item : meal.getItems()) {
            if (item.getCarbsG() != null) {
                totalCarbs = totalCarbs.add(item.getCarbsG());
            }
            if (item.getCalories() != null) {
                totalCalories = totalCalories.add(item.getCalories());
            }
        }

        meal.setTotalCarbsG(totalCarbs);
        meal.setTotalCalories(totalCalories);
    }
}
