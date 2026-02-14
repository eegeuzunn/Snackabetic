CREATE TABLE insulin_doses (
    id BIGSERIAL PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    dose_time TIMESTAMP NOT NULL,
    units DECIMAL(6,2) NOT NULL,
    insulin_type VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insulin_doses_patient_profile_id ON insulin_doses(patient_profile_id);
CREATE INDEX idx_insulin_doses_dose_time ON insulin_doses(dose_time);
