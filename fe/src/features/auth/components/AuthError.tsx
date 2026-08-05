interface AuthErrorProps {
  message: string | null
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) {
    return null
  }

  return (
    <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  )
}
