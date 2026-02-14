package com.snackabetic.backend.common.exception;

import com.snackabetic.backend.common.dto.ErrorCode;

public class UnauthorizedException extends BaseException {

    public UnauthorizedException() {
        super(ErrorCode.AUTH_UNAUTHORIZED);
    }

    public UnauthorizedException(String message) {
        super(ErrorCode.AUTH_UNAUTHORIZED, message);
    }
}
