package com.snackabetic.backend.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    @Builder.Default
    private boolean success = false;

    private ErrorDetail error;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ErrorDetail {
        private String code;
        private String message;
        private Object details;
    }

    public static ErrorResponse of(ErrorCode errorCode) {
        return ErrorResponse.builder()
                .error(ErrorDetail.builder()
                        .code(errorCode.name())
                        .message(errorCode.getDefaultMessage())
                        .build())
                .build();
    }

    public static ErrorResponse of(ErrorCode errorCode, String message) {
        return ErrorResponse.builder()
                .error(ErrorDetail.builder()
                        .code(errorCode.name())
                        .message(message)
                        .build())
                .build();
    }

    public static ErrorResponse of(ErrorCode errorCode, String message, Object details) {
        return ErrorResponse.builder()
                .error(ErrorDetail.builder()
                        .code(errorCode.name())
                        .message(message)
                        .details(details)
                        .build())
                .build();
    }
}
