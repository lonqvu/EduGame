package com.edugame.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base exception for expected, domain-level failures. Modules extend it or throw it directly.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public BusinessException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
