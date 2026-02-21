package com.snackabetic.backend.insulin.service;

import com.snackabetic.backend.common.exception.ResourceNotFoundException;
import com.snackabetic.backend.insulin.dto.InsulinDoseRequest;
import com.snackabetic.backend.insulin.dto.InsulinDoseResponse;
import com.snackabetic.backend.insulin.entity.InsulinDose;
import com.snackabetic.backend.insulin.repository.InsulinDoseRepository;
import com.snackabetic.backend.patient.service.PatientProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InsulinDoseService {

    private final InsulinDoseRepository insulinDoseRepository;
    private final PatientProfileService patientProfileService;

    @Transactional
    public InsulinDoseResponse create(String email, InsulinDoseRequest request) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        InsulinDose dose = InsulinDose.builder()
                .patientProfileId(profileId)
                .doseTime(request.getDoseTime())
                .units(request.getUnits())
                .insulinType(request.getInsulinType())
                .notes(request.getNotes())
                .build();

        dose = insulinDoseRepository.save(dose);
        return InsulinDoseResponse.from(dose);
    }

    public InsulinDoseResponse getById(String email, Long doseId) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        InsulinDose dose = insulinDoseRepository.findById(doseId)
                .orElseThrow(() -> new ResourceNotFoundException("İnsülin dozu", doseId));

        if (!dose.getPatientProfileId().equals(profileId)) {
            throw new ResourceNotFoundException("İnsülin dozu", doseId);
        }

        return InsulinDoseResponse.from(dose);
    }

    public Page<InsulinDoseResponse> getMyDoses(String email, Pageable pageable) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        return insulinDoseRepository.findByPatientProfileIdOrderByDoseTimeDesc(profileId, pageable)
                .map(InsulinDoseResponse::from);
    }

    public List<InsulinDoseResponse> getByDate(String email, LocalDate date) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        return insulinDoseRepository
                .findByPatientProfileIdAndDoseTimeBetweenOrderByDoseTimeAsc(profileId, start, end)
                .stream()
                .map(InsulinDoseResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(String email, Long doseId) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        InsulinDose dose = insulinDoseRepository.findById(doseId)
                .orElseThrow(() -> new ResourceNotFoundException("İnsülin dozu", doseId));

        if (!dose.getPatientProfileId().equals(profileId)) {
            throw new ResourceNotFoundException("İnsülin dozu", doseId);
        }

        insulinDoseRepository.delete(dose);
    }
}
