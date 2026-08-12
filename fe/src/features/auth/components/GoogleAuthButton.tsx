import { CircleUserRound } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import { getGoogleAuthUrl } from '../api/auth-api'

export function GoogleAuthButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.href = getGoogleAuthUrl()
      }}
    >
      <CircleUserRound />
      Tiếp tục với Google
    </Button>
  )
}
