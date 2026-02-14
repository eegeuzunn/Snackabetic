CREATE TABLE patient_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    sex VARCHAR(10),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    diabetes_type VARCHAR(20),
    diagnosis_date DATE,
    target_glucose_min INT,
    target_glucose_max INT,
    carb_ratio DECIMAL(6,2),
    correction_factor DECIMAL(6,2),
    timezone VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
