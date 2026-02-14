CREATE TABLE glucose_readings (
    id BIGSERIAL PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    reading_time TIMESTAMP NOT NULL,
    value_mg_dl INT NOT NULL,
    source VARCHAR(20) NOT NULL,
    tag VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_glucose_readings_patient_profile_id ON glucose_readings(patient_profile_id);
CREATE INDEX idx_glucose_readings_reading_time ON glucose_readings(reading_time);
