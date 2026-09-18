import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// Save the profile after Auth0 returns from login or registration.
export default function useSaveUser() {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0()
  const [profileError, setProfileError] = useState('')
  const [isSaving, setIsSaving] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    let active = true
    const controller = new AbortController()

    async function saveProfile() {
      setProfileError('')
      setIsSaving(true)

      try {
        const token = await getAccessTokenSilently()
        if (!active) return

        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5050').replace(/\/$/, '')
        const response = await fetch(`${apiUrl}/users/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: user.name || user.nickname,
            email: user.email,
            picture: user.picture,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.msg || `Profile request failed (${response.status}). Please retry.`)
        }
      } catch (error) {
        if (active) setProfileError(error.message || 'Unable to save your profile.')
      } finally {
        if (active) setIsSaving(false)
      }
    }

    saveProfile()

    return () => {
      active = false
      controller.abort()
    }
  }, [isAuthenticated, user, getAccessTokenSilently, attempt])

  return { profileError, isSaving, retry: () => setAttempt(value => value + 1) }
}
