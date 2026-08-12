export interface AuthUser {
  id: string
  fullName: string
  username: string | null
  email: string
  phone: string | null
  role: 'user' | 'admin'
  address: string | null
  dateOfBirth: string | null
  gender: string | null
  avatar: string | null
  bio: string | null
  googleId: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSessionResponse {
  user: AuthUser
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  username?: string
  email: string
  password: string
  phone?: string
}
