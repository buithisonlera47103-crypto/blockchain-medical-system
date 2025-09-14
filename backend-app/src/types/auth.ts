export interface AuthToken {
  token: string;
  expiresIn: number;
  refreshToken?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  permissions?: string[];
}

export interface AuthRequest {
  user?: AuthUser;
  token?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}
