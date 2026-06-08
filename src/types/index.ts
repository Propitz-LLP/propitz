export * from './investor'
export * from './property'
export * from './transaction'
export * from './investment'
export * from './document'

export type UserRole = 'investor' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

export interface ApiError {
  code: string
  message: string
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError }
