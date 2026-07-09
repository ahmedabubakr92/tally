import { hash, compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET must be defined in .env and be at least 32 characters long.",
  );
}

const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayloadData {
  userId: string;
}

// Password hashing
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hashStr: string,
): Promise<boolean> {
  return compare(plain, hashStr);
}

// JWT operations
export async function signToken(payload: JWTPayloadData): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(encodedSecret);
}

export async function verifyToken(
  token: string,
): Promise<JWTPayloadData | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret, {
      algorithms: ["HS256"],
    });
    return payload as unknown as JWTPayloadData;
  } catch {
    return null;
  }
}

// Cookie fetching
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}
