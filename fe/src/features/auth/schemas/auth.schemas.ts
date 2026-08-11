import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Nhập email hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
})

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Nhập họ và tên của bạn.').max(160),
  username: z.string().trim().max(80).optional(),
  email: z.email('Nhập email hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  phone: z.string().trim().max(40).optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
