/**
 * Module: auth.
 * <p>
 * Authentication: sign-in with username or email and password, access tokens (JWT, 15 min) and sign-in sessions
 * ({@code user_session}) whose refresh token lives in an HttpOnly cookie and rotates on every refresh. Signing out
 * ends the session, which invalidates its access tokens at once ({@code SessionTokenValidator}).
 * <p>
 * Sign-up: a 6-digit code mailed to the address ({@code email_verification}, {@code AuthMailer}); the teacher is
 * only created once the code matches.
 * <p>
 * Forgotten password: the same codes (purpose RESET_PASSWORD); a reset ends every earlier session of the account.
 * <p>
 * Planned: password change while signed in, Google sign-in, sessions per device.
 */
package com.edugame.auth;
