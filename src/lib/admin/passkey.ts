import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

const RP_NAME = "pf-admin";
const RP_ID = "sarang.dev"; // override via env in prod

// Single-admin site — a stable user handle so every passkey the same person
// registers (MacBook Touch ID today, iPhone tomorrow, YubiKey later) is tied
// to one discoverable identity. macOS Keychain, iCloud Keychain, 1Password,
// and Chrome's Password Manager all key discoverable credentials off the
// user handle + rpID; a fresh randomUUID per ceremony means each new
// passkey looks like a brand-new user to the password manager, which (a)
// fragments storage across multiple "users" in the password manager UI,
// (b) breaks the conditional-UI / autofill prompt, and (c) for macOS
// specifically, prevents the credential from syncing to iCloud Keychain as
// the same person.
const STABLE_USER_HANDLE = new TextEncoder().encode("pf-admin");
const STABLE_USER_NAME = "admin";
const STABLE_USER_DISPLAY_NAME = "Site Administrator";

export interface PasskeyRecord {
  credential_id: string;
  public_key: Uint8Array<ArrayBuffer>;
  counter: number;
  transports: AuthenticatorTransportFuture[];
}

export async function makeRegistrationOptions() {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: STABLE_USER_HANDLE,
    userName: STABLE_USER_NAME,
    userDisplayName: STABLE_USER_DISPLAY_NAME,
    authenticatorSelection: { userVerification: "required", residentKey: "required" },
  });
}

export async function verifyRegistration(response: unknown, expectedChallenge: string) {
  return verifyRegistrationResponse({
    response: response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
    expectedChallenge,
    expectedOrigin: `https://${RP_ID}`,
    expectedRPID: RP_ID,
  });
}

export async function makeAuthOptions() {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    // Omit allowCredentials to enable resident-key / discoverable-credential
    // autofill (the browser surfaces any passkey for this rpID in its
    // conditional-UI prompt instead of requiring the user to click first).
    userVerification: "required",
  });
}

export async function verifyAuth(response: unknown, expectedChallenge: string, passkey: PasskeyRecord) {
  return verifyAuthenticationResponse({
    response: response as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
    expectedChallenge,
    expectedOrigin: `https://${RP_ID}`,
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credential_id,
      publicKey: passkey.public_key,
      counter: passkey.counter,
      transports: passkey.transports,
    },
  });
}
