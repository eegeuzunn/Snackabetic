package com.snackabetic.backend.insulin.controller;

import com.snackabetic.backend.common.dto.ApiResponse;
import com.snackabetic.backend.insulin.dto.InsulinDoseRequest;
import com.snackabetic.backend.insulin.dto.InsulinDoseResponse;
import com.snackabetic.backend.insulin.service.InsulinDoseService;
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
@RequestMapping("/insulin-doses")
@RequiredArgsConstructor
@Tag(name = "Insulin Doses", description = "İnsülin doz takibi")
public class InsulinDoseController {

    private final InsulinDoseService insulinDoseService;

    @PostMapping
    @Operation(summary = "Yeni insülin dozu ekle")
    public ResponseEntity<ApiResponse<InsulinDoseResponse>> create(
            Authentication authentication,
            @Valid @RequestBody InsulinDoseRequest request) {
        InsulinDoseResponse data = insulinDoseService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(data, "İnsülin dozu başarıyla kaydedildi"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Doz detayını getir")
    public ResponseEntity<ApiResponse<InsulinDoseResponse>> getById(
            Authentication authentication,
            @PathVariable Long id) {
        InsulinDoseResponse data = insulinDoseService.getById(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping
    @Operation(summary = "Kendi insülin dozlarını listele (sayfalı)")
    public ResponseEntity<ApiResponse<Page<InsulinDoseResponse>>> getMyDoses(
            Authentication authentication,
            @ParameterObject Pageable pageable) {
        Page<InsulinDoseResponse> data = insulinDoseService.getMyDoses(authentication.getName(), pageable);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/by-date")
    @Operation(summary = "Tarihe göre insülin dozlarını getir")
    public ResponseEntity<ApiResponse<List<InsulinDoseResponse>>> getByDate(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<InsulinDoseResponse> data = insulinDoseService.getByDate(authentication.getName(), date);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "İnsülin dozunu sil")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication,
            @PathVariable Long id) {
        insulinDoseService.delete(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok("İnsülin dozu silindi"));
    }
}
