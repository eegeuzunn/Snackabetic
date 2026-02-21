package com.snackabetic.backend.meal.controller;

import com.snackabetic.backend.common.dto.ApiResponse;
import com.snackabetic.backend.meal.dto.MealRequest;
import com.snackabetic.backend.meal.dto.MealResponse;
import com.snackabetic.backend.meal.service.MealService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/meals")
@RequiredArgsConstructor
@Tag(name = "Meals", description = "Öğün takibi ve fotoğraf yükleme")
public class MealController {

    private final MealService mealService;

    @PostMapping
    @Operation(summary = "Yeni öğün oluştur")
    public ResponseEntity<ApiResponse<MealResponse>> create(
            Authentication authentication,
            @Valid @RequestBody MealRequest request) {
        MealResponse data = mealService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(data, "Öğün başarıyla oluşturuldu"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Öğün detayını getir")
    public ResponseEntity<ApiResponse<MealResponse>> getById(
            Authentication authentication,
            @PathVariable Long id) {
        MealResponse data = mealService.getById(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping
    @Operation(summary = "Kendi öğünlerini listele (sayfalı)")
    public ResponseEntity<ApiResponse<Page<MealResponse>>> getMyMeals(
            Authentication authentication,
            @ParameterObject Pageable pageable) {
        Page<MealResponse> data = mealService.getMyMeals(authentication.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/by-date")
    @Operation(summary = "Tarihe göre öğünleri getir")
    public ResponseEntity<ApiResponse<List<MealResponse>>> getByDate(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<MealResponse> data = mealService.getByDate(authentication.getName(), date);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Öğünü sil")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication,
            @PathVariable Long id) {
        mealService.delete(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok("Öğün silindi"));
    }
}
