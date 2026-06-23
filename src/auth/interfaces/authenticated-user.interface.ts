// Verified token claims attached to the request — not the persisted DB user.
export interface AuthenticatedUser {
  googleId: string; // Google "sub" claim; stable per account.
  email: string;
  name?: string;
}
