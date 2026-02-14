package com.snackabetic.backend.common.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ErrorCode {

    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "E-posta veya şifre hatalı"),
    AUTH_EMAIL_EXISTS(HttpStatus.CONFLICT, "Bu e-posta adresi zaten kayıtlı"),
    AUTH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "Oturum süresi dolmuş"),
    AUTH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Geçersiz token"),
    AUTH_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Kimlik doğrulama gerekli"),

    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "İstenen kaynak bulunamadı"),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "İstek verisi doğrulanamadı"),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "Geçersiz istek"),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "Kaynak zaten mevcut"),
    FILE_UPLOAD_ERROR(HttpStatus.BAD_REQUEST, "Dosya yükleme hatası"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Beklenmeyen bir hata oluştu");

    private final HttpStatus httpStatus;
    private final String defaultMessage;
}
