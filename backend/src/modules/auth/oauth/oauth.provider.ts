export type OAuthProfile = {
  id: string;
  email: string;
  name?: string | null;
};

export interface AuthProvider {
  /**
   * Unique provider slug, e.g. "google" or "linkedin".
   */
  readonly name: string;

  /**
   * Returns whether the provider is available (based on env/feature flag).
   */
  isEnabled(): boolean;

  /**
   * Returns the authorization URL that the client should redirect to.
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchanges an OAuth authorization code for a profile.
   */
  exchangeCode(code: string): Promise<OAuthProfile>;
}
