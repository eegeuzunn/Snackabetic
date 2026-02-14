package com.snackabetic.backend.patient.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientProfileRequest {

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
}
