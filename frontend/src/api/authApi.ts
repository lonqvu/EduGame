import { authClient } from '@/api/session'
import type {
  CodeSentResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  TokenResponse,
  VerifyEmailRequest,
} from '@/types/api'

/** Also sets the refresh token cookie. */
export async function login(request: LoginRequest): Promise<TokenResponse> {
  const { data } = await authClient.post<TokenResponse>('/v1/auth/login', request)
  return data
}

/** Ends the session of the refresh token cookie (its access tokens stop working) and clears the cookie. */
export async function logout(): Promise<void> {
  await authClient.post('/v1/auth/logout')
}

/** Mails a 6-digit code; the account is only created by verifyEmail. Same answer if the address is taken. */
export async function register(request: RegisterRequest): Promise<CodeSentResponse> {
  const { data } = await authClient.post<CodeSentResponse>('/v1/auth/register', request)
  return data
}

export async function resendCode(email: string): Promise<CodeSentResponse> {
  const { data } = await authClient.post<CodeSentResponse>('/v1/auth/register/resend', { email })
  return data
}

/** Creates the teacher and signs them in (same answer as login, sets the refresh token cookie). */
export async function verifyEmail(request: VerifyEmailRequest): Promise<TokenResponse> {
  const { data } = await authClient.post<TokenResponse>('/v1/auth/register/verify', request)
  return data
}

/** Mails a code to reset the password (also to get a new one). Same answer whether or not the address has an account. */
export async function forgotPassword(email: string): Promise<CodeSentResponse> {
  const { data } = await authClient.post<CodeSentResponse>('/v1/auth/password/forgot', { email })
  return data
}

/** Sets the new password with the code; ends the other sessions and signs in (same answer as login). */
export async function resetPassword(request: ResetPasswordRequest): Promise<TokenResponse> {
  const { data } = await authClient.post<TokenResponse>('/v1/auth/password/reset', request)
  return data
}
