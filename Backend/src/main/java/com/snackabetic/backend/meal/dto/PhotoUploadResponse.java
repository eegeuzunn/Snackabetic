package com.snackabetic.backend.meal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoUploadResponse {

    private String photoUrl;

    public static PhotoUploadResponse of(String photoUrl) {
        return PhotoUploadResponse.builder()
                .photoUrl(photoUrl)
                .build();
    }
}
