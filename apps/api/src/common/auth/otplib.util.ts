type OtplibModule = {
  generateSecret: (options?: { length?: number }) => string;
  generateURI: (options: {
    issuer: string;
    label: string;
    secret: string;
    strategy?: "totp" | "hotp";
    algorithm?: string;
    digits?: number;
    period?: number;
    counter?: number;
  }) => string;
  verify: (options: {
    token: string;
    secret: string;
  }) => Promise<{ valid: boolean; delta?: number; epoch?: number; counter?: number }>;
  generateSync: (options: { secret: string }) => string;
};

let otplibPromise: Promise<OtplibModule> | null = null;

async function getOtplib(): Promise<OtplibModule> {
  if (!otplibPromise) {
    otplibPromise = import("otplib") as Promise<OtplibModule>;
  }
  return otplibPromise;
}

export async function generateSecret(): Promise<string> {
  const { generateSecret: gen } = await getOtplib();
  return gen();
}

export async function generateURI(
  params: Parameters<OtplibModule["generateURI"]>[0]
): Promise<string> {
  const { generateURI: gen } = await getOtplib();
  return gen(params);
}

export async function verify(
  params: Parameters<OtplibModule["verify"]>[0]
): Promise<Awaited<ReturnType<OtplibModule["verify"]>>> {
  const { verify: ver } = await getOtplib();
  return ver(params);
}

export async function generateSync(
  params: Parameters<OtplibModule["generateSync"]>[0]
): Promise<string> {
  const { generateSync: gen } = await getOtplib();
  return gen(params);
}
