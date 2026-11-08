package com.edugame.auth.service;

import com.edugame.auth.dto.GoogleLoginRequest;
import com.edugame.user.dto.UserAccount;
import com.edugame.user.service.UserRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * "Đăng nhập với Google": a verified Google ID token signs the teacher in, linking or creating the account first
 * ({@link UserRegistrationService#findOrCreateGoogleTeacher}). Same answer as a password sign-in.
 */
@Service
@RequiredArgsConstructor
public class GoogleSignInService {

    private final GoogleIdTokenVerifier verifier;
    private final UserRegistrationService userRegistrationService;
    private final AuthService authService;

    public AuthService.SignedIn signIn(GoogleLoginRequest request, String userAgent) {
        GoogleIdTokenVerifier.GoogleIdentity identity = verifier.verify(request.credential().strip());
        UserAccount account = userRegistrationService.findOrCreateGoogleTeacher(identity.sub(), identity.email(),
                identity.name());
        return authService.signIn(account, request.rememberMe(), userAgent);
    }
}
