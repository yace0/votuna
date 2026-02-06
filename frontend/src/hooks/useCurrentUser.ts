import { useQuery } from '@tanstack/react-query'

import { apiJsonOrNull } from '@/lib/api'
import type { User } from '@/types/user'

export const currentUserQueryKey = ['currentUser'] as const

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => apiJsonOrNull<User>('/api/v1/users/me'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
