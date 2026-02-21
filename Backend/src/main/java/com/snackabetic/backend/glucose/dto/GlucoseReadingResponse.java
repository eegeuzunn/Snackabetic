package com.snackabetic.backend.glucose.dto;

import com.snackabetic.backend.glucose.entity.GlucoseReading;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlucoseReadingResponse {

    private Long id;
    private Long patientProfileId;
    private LocalDateTime readingTime;
    private Integer valueMgDl;
    private String source;
    private String tag;
    private String notes;
    private LocalDateTime createdAt;

    public static GlucoseReadingResponse from(GlucoseReading reading) {
        return GlucoseReadingResponse.builder()
                .id(reading.getId())
                .patientProfileId(reading.getPatientProfileId())
                .readingTime(reading.getReadingTime())
                .valueMgDl(reading.getValueMgDl())
                .source(reading.getSource())
                .tag(reading.getTag())
                .notes(reading.getNotes())
                .createdAt(reading.getCreatedAt())
                .build();
    }
}
