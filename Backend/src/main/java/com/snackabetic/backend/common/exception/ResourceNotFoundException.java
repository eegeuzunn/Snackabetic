package com.snackabetic.backend.common.exception;

import com.snackabetic.backend.common.dto.ErrorCode;

public class ResourceNotFoundException extends BaseException {

    public ResourceNotFoundException(String message) {
        super(ErrorCode.RESOURCE_NOT_FOUND, message);
    }

    public ResourceNotFoundException(String resourceName, Long id) {
        super(ErrorCode.RESOURCE_NOT_FOUND, resourceName + " bulunamadı: id=" + id);
    }
}
