package com.edugame.security;

import com.edugame.common.config.AppProperties;
import com.edugame.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Stateless API security: every request is authenticated by its {@code Authorization: Bearer <access token>}
 * header, which browsers never add on their own, hence no CSRF tokens. The one cookie, the refresh token, is
 * {@code SameSite=Strict} and only sent to {@code /api/v1/auth}. CORS follows {@code WebConfig}.
 * <p>
 * Public: sign-in (login, refresh, logout), sign-up, password reset, the game template catalogue and the API docs.
 * Everything else needs a signed-in user.
 * <p>
 * Role checks go on the controller method: {@code @PreAuthorize("hasRole('ADMIN')")} (403 {@code FORBIDDEN}
 * otherwise). Ownership of games and classrooms is checked in their services.
 */
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Access token claim that lists the user's roles ({@code ["TEACHER"]}). */
    public static final String ROLES_CLAIM = "roles";

    private final AppProperties appProperties;
    private final SecurityErrorHandler securityErrorHandler;

    @Bean
    public SecurityFilterChain apiSecurity(HttpSecurity http, UserAccountService userAccountService)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Refresh and logout authenticate with the refresh token cookie instead; sign-up with the
                        // emailed code; password reset too.
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh",
                                "/api/v1/auth/logout", "/api/v1/auth/register", "/api/v1/auth/register/resend",
                                "/api/v1/auth/register/verify", "/api/v1/auth/password/forgot",
                                "/api/v1/auth/password/reset").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/game-templates/**").permitAll()
                        // Uploaded profile pictures: shown by <img>, which sends no token (random addresses).
                        .requestMatchers(HttpMethod.GET, "/api/v1/avatars/*").permitAll()
                        // Uploaded images, shown by <img> tags that send no token (the URLs are unguessable).
                        .requestMatchers(HttpMethod.GET, "/api/v1/assets/*").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(securityErrorHandler))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler));

        String defaultUserCode = appProperties.auth() == null ? null : appProperties.auth().defaultUserCode();
        if (defaultUserCode != null && !defaultUserCode.isBlank()) {
            http.addFilterAfter(new DefaultUserAuthenticationFilter(defaultUserCode, userAccountService),
                    BearerTokenAuthenticationFilter.class);
        }
        return http.build();
    }

    /**
     * Stores new passwords as BCrypt ({@code {bcrypt}...}) and still reads the other encoders by their prefix, so
     * old hashes keep working and are upgraded at the next sign-in.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /** Checks username and password at sign-in ({@code AuthService}). */
    @Bean
    public AuthenticationManager authenticationManager(UserAccountService userAccountService,
                                                       PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userAccountService);
        provider.setPasswordEncoder(passwordEncoder);
        provider.setUserDetailsPasswordService(userAccountService);
        return new ProviderManager(provider);
    }

    /** Token {@code sub} (the user code) becomes the authentication name, {@code roles} become {@code ROLE_*}. */
    private static JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(ROLES_CLAIM);
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}
