package com.snackabetic.backend.glucose.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlucoseReadingRequest {

    @NotNull(message = "Ölçüm zamanı zorunludur")
    private LocalDateTime readingTime;

    @NotNull(message = "Kan şekeri değeri zorunludur")
    @Positive(message = "Kan şekeri değeri pozitif olmalıdır")
    private Integer valueMgDl;

    @NotBlank(message = "Kaynak zorunludur")
    private String source;

    private String tag;
    private String notes;
}
