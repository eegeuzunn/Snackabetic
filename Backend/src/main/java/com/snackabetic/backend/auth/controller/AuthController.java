package com.snackabetic.backend.auth.controller;

import com.snackabetic.backend.auth.dto.AuthResponse;
import com.snackabetic.backend.auth.dto.LoginRequest;
import com.snackabetic.backend.auth.dto.RegisterRequest;
import com.snackabetic.backend.auth.dto.UserResponse;
import com.snackabetic.backend.auth.service.AuthService;
import com.snackabetic.backend.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Kimlik doğrulama ve kullanıcı yönetimi")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Yeni kullanıcı kaydı")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse data = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(data, "Kayıt başarılı"));
    }

    @PostMapping("/login")
    @Operation(summary = "Kullanıcı girişi")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse data = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(data, "Giriş başarılı"));
    }

    @GetMapping("/me")
    @Operation(summary = "Giriş yapmış kullanıcının bilgileri")
    public ResponseEntity<ApiResponse<UserResponse>> me(Authentication authentication) {
        UserResponse data = authService.me(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}
