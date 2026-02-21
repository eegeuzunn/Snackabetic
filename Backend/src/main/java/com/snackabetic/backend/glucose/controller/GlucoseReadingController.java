package com.snackabetic.backend.glucose.controller;

import com.snackabetic.backend.common.dto.ApiResponse;
import com.snackabetic.backend.glucose.dto.DailyGlucoseStatsResponse;
import com.snackabetic.backend.glucose.dto.GlucoseReadingRequest;
import com.snackabetic.backend.glucose.dto.GlucoseReadingResponse;
import com.snackabetic.backend.glucose.service.GlucoseReadingService;
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
@RequestMapping("/glucose-readings")
@RequiredArgsConstructor
@Tag(name = "Glucose Readings", description = "Kan şekeri ölçüm takibi")
public class GlucoseReadingController {

    private final GlucoseReadingService glucoseReadingService;

    @PostMapping
    @Operation(summary = "Yeni kan şekeri ölçümü ekle")
    public ResponseEntity<ApiResponse<GlucoseReadingResponse>> create(
            Authentication authentication,
            @Valid @RequestBody GlucoseReadingRequest request) {
        GlucoseReadingResponse data = glucoseReadingService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(data, "Ölçüm başarıyla kaydedildi"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Ölçüm detayını getir")
    public ResponseEntity<ApiResponse<GlucoseReadingResponse>> getById(
            Authentication authentication,
            @PathVariable Long id) {
        GlucoseReadingResponse data = glucoseReadingService.getById(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping
    @Operation(summary = "Kendi ölçümlerini listele (sayfalı)")
    public ResponseEntity<ApiResponse<Page<GlucoseReadingResponse>>> getMyReadings(
            Authentication authentication,
            @ParameterObject Pageable pageable) {
        Page<GlucoseReadingResponse> data = glucoseReadingService.getMyReadings(authentication.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/by-date")
    @Operation(summary = "Tarihe göre ölçümleri getir")
    public ResponseEntity<ApiResponse<List<GlucoseReadingResponse>>> getByDate(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<GlucoseReadingResponse> data = glucoseReadingService.getByDate(authentication.getName(), date);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/daily-stats")
    @Operation(summary = "Günlük kan şekeri istatistikleri (min/max/ort)")
    public ResponseEntity<ApiResponse<DailyGlucoseStatsResponse>> getDailyStats(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailyGlucoseStatsResponse data = glucoseReadingService.getDailyStats(authentication.getName(), date);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Ölçümü sil")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication,
            @PathVariable Long id) {
        glucoseReadingService.delete(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok("Ölçüm silindi"));
    }
}
