CREATE TABLE meals (
    id BIGSERIAL PRIMARY KEY,
    patient_profile_id BIGINT NOT NULL,
    meal_time TIMESTAMP NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    total_carbs_g DECIMAL(7,2),
    total_calories DECIMAL(8,2),
    photo_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meals_patient_profile_id ON meals(patient_profile_id);
CREATE INDEX idx_meals_meal_time ON meals(meal_time);
