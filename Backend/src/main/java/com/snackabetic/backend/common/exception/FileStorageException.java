package com.snackabetic.backend.common.exception;

import com.snackabetic.backend.common.dto.ErrorCode;

public class FileStorageException extends BaseException {

    public FileStorageException(String message) {
        super(ErrorCode.FILE_UPLOAD_ERROR, message);
    }
}
