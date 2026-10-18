package com.edugame.user.dto;

/** @param otherSessions sessions on other devices that were signed out */
public record SignedOutResponse(int otherSessions) {
}
