package com.snackabetic.backend.insulin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InsulinDoseRequest {

    @NotNull(message = "Doz zamanı zorunludur")
    private LocalDateTime doseTime;

    @NotNull(message = "İnsülin dozu zorunludur")
    @Positive(message = "İnsülin dozu pozitif olmalıdır")
    private BigDecimal units;

    @NotBlank(message = "İnsülin tipi zorunludur")
    private String insulinType;

    private String notes;
}
