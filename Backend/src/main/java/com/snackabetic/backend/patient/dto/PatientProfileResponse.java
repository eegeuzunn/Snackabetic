package com.snackabetic.backend.patient.dto;

import com.snackabetic.backend.patient.entity.PatientProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientProfileResponse {

    private Long id;
    private Long userId;
    private LocalDate dateOfBirth;
    private String sex;
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private String diabetesType;
    private LocalDate diagnosisDate;
    private Integer targetGlucoseMin;
    private Integer targetGlucoseMax;
    private BigDecimal carbRatio;
    private BigDecimal correctionFactor;
    private String timezone;

    public static PatientProfileResponse from(PatientProfile profile) {
        return PatientProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .dateOfBirth(profile.getDateOfBirth())
                .sex(profile.getSex())
                .heightCm(profile.getHeightCm())
                .weightKg(profile.getWeightKg())
                .diabetesType(profile.getDiabetesType())
                .diagnosisDate(profile.getDiagnosisDate())
                .targetGlucoseMin(profile.getTargetGlucoseMin())
                .targetGlucoseMax(profile.getTargetGlucoseMax())
                .carbRatio(profile.getCarbRatio())
                .correctionFactor(profile.getCorrectionFactor())
                .timezone(profile.getTimezone())
                .build();
    }
}
