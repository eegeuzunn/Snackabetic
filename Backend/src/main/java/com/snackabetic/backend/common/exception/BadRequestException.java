package com.snackabetic.backend.common.exception;

import com.snackabetic.backend.common.dto.ErrorCode;

public class BadRequestException extends BaseException {

    public BadRequestException(String message) {
        super(ErrorCode.BAD_REQUEST, message);
    }
}
