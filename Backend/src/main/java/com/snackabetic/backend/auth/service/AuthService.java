package com.snackabetic.backend.auth.service;

import com.snackabetic.backend.auth.dto.*;
import com.snackabetic.backend.auth.entity.User;
import com.snackabetic.backend.auth.repository.UserRepository;
import com.snackabetic.backend.auth.security.JwtService;
import com.snackabetic.backend.common.dto.ErrorCode;
import com.snackabetic.backend.common.exception.BaseException;
import com.snackabetic.backend.common.exception.DuplicateResourceException;
import com.snackabetic.backend.patient.entity.PatientProfile;
import com.snackabetic.backend.patient.repository.PatientProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PatientProfileRepository patientProfileRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Bu e-posta adresi zaten kayıtlı: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .build();

        user = userRepository.save(user);

        // Otomatik boş hasta profili oluştur
        PatientProfile profile = PatientProfile.builder()
                .userId(user.getId())
                .build();
        patientProfileRepository.save(profile);

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (BadCredentialsException e) {
            throw new BaseException(ErrorCode.AUTH_INVALID_CREDENTIALS) {
            };
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BaseException(ErrorCode.AUTH_INVALID_CREDENTIALS) {
                });

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(UserResponse.from(user))
                .build();
    }

    public UserResponse me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BaseException(ErrorCode.RESOURCE_NOT_FOUND, "Kullanıcı bulunamadı") {
                });
        return UserResponse.from(user);
    }
}
