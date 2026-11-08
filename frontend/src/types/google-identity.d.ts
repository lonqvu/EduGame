/**
 * The part of Google Identity Services (https://accounts.google.com/gsi/client) the sign-in button uses.
 * https://developers.google.com/identity/gsi/web/reference/js-reference
 */
declare namespace google.accounts.id {
  interface CredentialResponse {
    /** The ID token (a JWT) the backend verifies. */
    credential: string
    select_by?: string
  }

  interface IdConfiguration {
    client_id: string
    callback: (response: CredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    context?: 'signin' | 'signup' | 'use'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    itp_support?: boolean
    use_fedcm_for_button?: boolean
  }

  interface GsiButtonConfiguration {
    type?: 'standard' | 'icon'
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    /** Pixels, 200 to 400. */
    width?: number
    locale?: string
  }

  function initialize(config: IdConfiguration): void
  function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void
  function disableAutoSelect(): void
}

interface Window {
  google?: { accounts?: { id?: typeof google.accounts.id } }
}
