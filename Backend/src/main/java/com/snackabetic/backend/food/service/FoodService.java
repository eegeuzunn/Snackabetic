package com.snackabetic.backend.food.service;

import com.snackabetic.backend.common.exception.ResourceNotFoundException;
import com.snackabetic.backend.food.dto.FoodResponse;
import com.snackabetic.backend.food.entity.Food;
import com.snackabetic.backend.food.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;

    public FoodResponse getById(Long id) {
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Yiyecek", id));
        return FoodResponse.from(food);
    }

    public Page<FoodResponse> search(String query, Pageable pageable) {
        return foodRepository.findByNameContainingIgnoreCase(query, pageable)
                .map(FoodResponse::from);
    }

    public Page<FoodResponse> getAll(Pageable pageable) {
        return foodRepository.findAll(pageable)
                .map(FoodResponse::from);
    }
}
