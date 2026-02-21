package com.snackabetic.backend.insulin.dto;

import com.snackabetic.backend.insulin.entity.InsulinDose;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsulinDoseResponse {

    private Long id;
    private Long patientProfileId;
    private LocalDateTime doseTime;
    private BigDecimal units;
    private String insulinType;
    private String notes;
    private LocalDateTime createdAt;

    public static InsulinDoseResponse from(InsulinDose dose) {
        return InsulinDoseResponse.builder()
                .id(dose.getId())
                .patientProfileId(dose.getPatientProfileId())
                .doseTime(dose.getDoseTime())
                .units(dose.getUnits())
                .insulinType(dose.getInsulinType())
                .notes(dose.getNotes())
                .createdAt(dose.getCreatedAt())
                .build();
    }
}
