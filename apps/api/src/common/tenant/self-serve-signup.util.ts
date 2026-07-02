export function isSelfServeSignupEnabled(): boolean {
  return process.env.SELF_SERVE_SIGNUP_ENABLED === "true";
}
