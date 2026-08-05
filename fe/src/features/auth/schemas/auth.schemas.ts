import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(160),
  username: z.string().trim().max(80).optional(),
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone: z.string().trim().max(40).optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
