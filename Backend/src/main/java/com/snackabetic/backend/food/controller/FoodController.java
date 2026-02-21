package com.snackabetic.backend.food.controller;

import com.snackabetic.backend.common.dto.ApiResponse;
import com.snackabetic.backend.food.dto.FoodResponse;
import com.snackabetic.backend.food.service.FoodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/foods")
@RequiredArgsConstructor
@Tag(name = "Foods", description = "Yiyecek veritabanı yönetimi")
public class FoodController {

    private final FoodService foodService;

    @GetMapping("/{id}")
    @Operation(summary = "ID ile yiyecek getir")
    public ResponseEntity<ApiResponse<FoodResponse>> getById(@PathVariable Long id) {
        FoodResponse data = foodService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/search")
    @Operation(summary = "İsme göre yiyecek ara")
    public ResponseEntity<ApiResponse<Page<FoodResponse>>> search(
            @RequestParam String query,
            @ParameterObject Pageable pageable) {
        Page<FoodResponse> data = foodService.search(query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping
    @Operation(summary = "Tüm yiyecekleri listele (sayfalı)")
    public ResponseEntity<ApiResponse<Page<FoodResponse>>> getAll(@ParameterObject Pageable pageable) {
        Page<FoodResponse> data = foodService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}
