import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/constants/queryKeys'
import { apiJsonOrNull } from '@/lib/api'
import type { User } from '@/types/user'

export const currentUserQueryKey = queryKeys.currentUser

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => apiJsonOrNull<User>('/api/v1/users/me'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
