export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  HOSPITAL_ADMIN = 'hospital_admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole | string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  // Legacy fields for backward compatibility
  role_id?: string;
  created_at?: Date;
  updated_at?: Date;
  // MFA fields (optional)
  mfa_enabled?: boolean;
  mfa_secret?: string;
  // OIDC fields (optional)
  oidc_provider?: string;
  oidc_subject?: string;
}

export interface Role {
  id?: string;
  role_name: UserRole;
  description?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface UserWithRole extends User {
  role: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole | string;
  preferences?: Record<string, unknown>;
  profile?: {
    bio?: string;
    website?: string;
    location?: string;
    dateOfBirth?: Date;
    phoneNumber?: string;
    socialLinks?: Record<string, string>;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
