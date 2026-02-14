package com.snackabetic.backend.patient.controller;

import com.snackabetic.backend.common.dto.ApiResponse;
import com.snackabetic.backend.patient.dto.PatientProfileRequest;
import com.snackabetic.backend.patient.dto.PatientProfileResponse;
import com.snackabetic.backend.patient.service.PatientProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/patient-profile")
@RequiredArgsConstructor
@Tag(name = "Patient Profile", description = "Hasta profili yönetimi")
public class PatientProfileController {

    private final PatientProfileService patientProfileService;

    @GetMapping("/me")
    @Operation(summary = "Kendi hasta profilini getir")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> getMyProfile(Authentication authentication) {
        PatientProfileResponse data = patientProfileService.getByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @PutMapping("/me")
    @Operation(summary = "Kendi hasta profilini güncelle")
    public ResponseEntity<ApiResponse<PatientProfileResponse>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody PatientProfileRequest request) {
        PatientProfileResponse data = patientProfileService.updateByEmail(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok(data, "Profil güncellendi"));
    }
}
