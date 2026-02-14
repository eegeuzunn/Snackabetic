CREATE TABLE meal_items (
    id BIGSERIAL PRIMARY KEY,
    meal_id BIGINT NOT NULL,
    food_id BIGINT NOT NULL,
    amount_grams DECIMAL(7,2) NOT NULL,
    carbs_g DECIMAL(7,2),
    calories DECIMAL(8,2)
);

CREATE INDEX idx_meal_items_meal_id ON meal_items(meal_id);
CREATE INDEX idx_meal_items_food_id ON meal_items(food_id);
