CREATE TABLE foods (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    carbs_per_100g DECIMAL(6,2) NOT NULL,
    protein_per_100g DECIMAL(6,2),
    fat_per_100g DECIMAL(6,2),
    fiber_per_100g DECIMAL(6,2),
    calories_per_100g DECIMAL(7,2),
    source VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_foods_name ON foods(name);
