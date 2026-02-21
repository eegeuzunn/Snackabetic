package com.snackabetic.backend.glucose.service;

import com.snackabetic.backend.common.exception.ResourceNotFoundException;
import com.snackabetic.backend.glucose.dto.DailyGlucoseStatsResponse;
import com.snackabetic.backend.glucose.dto.GlucoseReadingRequest;
import com.snackabetic.backend.glucose.dto.GlucoseReadingResponse;
import com.snackabetic.backend.glucose.entity.GlucoseReading;
import com.snackabetic.backend.glucose.repository.GlucoseReadingRepository;
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
public class GlucoseReadingService {

    private final GlucoseReadingRepository glucoseReadingRepository;
    private final PatientProfileService patientProfileService;

    @Transactional
    public GlucoseReadingResponse create(String email, GlucoseReadingRequest request) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        GlucoseReading reading = GlucoseReading.builder()
                .patientProfileId(profileId)
                .readingTime(request.getReadingTime())
                .valueMgDl(request.getValueMgDl())
                .source(request.getSource())
                .tag(request.getTag())
                .notes(request.getNotes())
                .build();

        reading = glucoseReadingRepository.save(reading);
        return GlucoseReadingResponse.from(reading);
    }

    public GlucoseReadingResponse getById(String email, Long readingId) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        GlucoseReading reading = glucoseReadingRepository.findById(readingId)
                .orElseThrow(() -> new ResourceNotFoundException("Kan şekeri ölçümü", readingId));

        if (!reading.getPatientProfileId().equals(profileId)) {
            throw new ResourceNotFoundException("Kan şekeri ölçümü", readingId);
        }

        return GlucoseReadingResponse.from(reading);
    }

    public Page<GlucoseReadingResponse> getMyReadings(String email, Pageable pageable) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        return glucoseReadingRepository.findByPatientProfileIdOrderByReadingTimeDesc(profileId, pageable)
                .map(GlucoseReadingResponse::from);
    }

    public List<GlucoseReadingResponse> getByDate(String email, LocalDate date) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        return glucoseReadingRepository
                .findByPatientProfileIdAndReadingTimeBetweenOrderByReadingTimeAsc(profileId, start, end)
                .stream()
                .map(GlucoseReadingResponse::from)
                .collect(Collectors.toList());
    }

    public DailyGlucoseStatsResponse getDailyStats(String email, LocalDate date) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        List<GlucoseReading> readings = glucoseReadingRepository
                .findByPatientProfileIdAndReadingTimeBetweenOrderByReadingTimeAsc(profileId, start, end);

        if (readings.isEmpty()) {
            return DailyGlucoseStatsResponse.builder()
                    .date(date)
                    .readingCount(0)
                    .minValueMgDl(0)
                    .maxValueMgDl(0)
                    .averageValueMgDl(0)
                    .build();
        }

        int min = readings.stream().mapToInt(GlucoseReading::getValueMgDl).min().orElse(0);
        int max = readings.stream().mapToInt(GlucoseReading::getValueMgDl).max().orElse(0);
        double avg = readings.stream().mapToInt(GlucoseReading::getValueMgDl).average().orElse(0);

        return DailyGlucoseStatsResponse.builder()
                .date(date)
                .readingCount(readings.size())
                .minValueMgDl(min)
                .maxValueMgDl(max)
                .averageValueMgDl(Math.round(avg * 100.0) / 100.0)
                .build();
    }

    @Transactional
    public void delete(String email, Long readingId) {
        Long profileId = patientProfileService.getProfileIdByEmail(email);

        GlucoseReading reading = glucoseReadingRepository.findById(readingId)
                .orElseThrow(() -> new ResourceNotFoundException("Kan şekeri ölçümü", readingId));

        if (!reading.getPatientProfileId().equals(profileId)) {
            throw new ResourceNotFoundException("Kan şekeri ölçümü", readingId);
        }

        glucoseReadingRepository.delete(reading);
    }
}
