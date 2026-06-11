interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    use_fedcm_for_prompt?: boolean
  }): void
  renderButton(
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_black' | 'filled_blue'
      size?: 'large' | 'medium' | 'small'
      shape?: 'pill' | 'rectangular' | 'circle' | 'square'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      width?: number
    },
  ): void
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId
    }
  }
}

