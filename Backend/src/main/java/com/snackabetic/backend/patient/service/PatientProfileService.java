package com.snackabetic.backend.patient.service;

import com.snackabetic.backend.auth.entity.User;
import com.snackabetic.backend.auth.repository.UserRepository;
import com.snackabetic.backend.common.exception.ResourceNotFoundException;
import com.snackabetic.backend.patient.dto.PatientProfileRequest;
import com.snackabetic.backend.patient.dto.PatientProfileResponse;
import com.snackabetic.backend.patient.entity.PatientProfile;
import com.snackabetic.backend.patient.repository.PatientProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatientProfileService {

    private final PatientProfileRepository patientProfileRepository;
    private final UserRepository userRepository;

    public PatientProfileResponse getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", null));

        PatientProfile profile = patientProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Hasta profili bulunamadı"));

        return PatientProfileResponse.from(profile);
    }

    @Transactional
    public PatientProfileResponse updateByEmail(String email, PatientProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", null));

        PatientProfile profile = patientProfileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    PatientProfile newProfile = new PatientProfile();
                    newProfile.setUserId(user.getId());
                    return newProfile;
                });

        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setSex(request.getSex());
        profile.setHeightCm(request.getHeightCm());
        profile.setWeightKg(request.getWeightKg());
        profile.setDiabetesType(request.getDiabetesType());
        profile.setDiagnosisDate(request.getDiagnosisDate());
        profile.setTargetGlucoseMin(request.getTargetGlucoseMin());
        profile.setTargetGlucoseMax(request.getTargetGlucoseMax());
        profile.setCarbRatio(request.getCarbRatio());
        profile.setCorrectionFactor(request.getCorrectionFactor());
        profile.setTimezone(request.getTimezone());

        profile = patientProfileRepository.save(profile);
        return PatientProfileResponse.from(profile);
    }

    public Long getProfileIdByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", null));

        return patientProfileRepository.findByUserId(user.getId())
                .map(PatientProfile::getId)
                .orElseThrow(() -> new ResourceNotFoundException("Hasta profili bulunamadı"));
    }
}
