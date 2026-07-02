import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

const RP_NAME = "pf-admin";
const RP_ID = "sarang.dev"; // override via env in prod

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
    userID: new TextEncoder().encode(crypto.randomUUID()),
    userName: "admin",
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

export async function makeAuthOptions(passkeys: PasskeyRecord[]) {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: passkeys.map((p) => ({ id: p.credential_id, transports: p.transports })),
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