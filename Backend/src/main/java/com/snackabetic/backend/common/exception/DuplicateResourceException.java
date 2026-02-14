package com.snackabetic.backend.common.exception;

import com.snackabetic.backend.common.dto.ErrorCode;

public class DuplicateResourceException extends BaseException {

    public DuplicateResourceException(String message) {
        super(ErrorCode.DUPLICATE_RESOURCE, message);
    }
}
