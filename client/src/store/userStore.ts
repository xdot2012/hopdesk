import { create } from 'zustand'
import type { AppLocale } from '~/util/constants';

type Notification = {
    id: string
    title: string
    text: string
    link?: string
    created_at?: string
    createdAt?: Date
}

type UserProfile = {
    id?: string
    email: string
    name?: string | null
    avatarUrl?: string | null
    avatarKey?: string | null
    locale?: AppLocale | string
    emailConfirmed?: boolean
    created_at: string
    role?: string | null
    permissions: string[]
    isSectorManager?: boolean
    sectorId?: string | null
    sectorName?: string | null
    sectorColor?: string | null
    managedSectorId?: string | null
    managedSectorName?: string | null
    managedSectorColor?: string | null
    notifications: Notification[]
}

type UserStore = {
    isProfileSet: boolean
    profile: UserProfile | null
    setUserProfile: (newProfile: UserProfile) => void
    cleanUserProfile: () => void
}

const useUserStore = create<UserStore>(
    (set) => (
    {
    isProfileSet: false,
    profile: null,
    setUserProfile: (newProfile: UserProfile) => {
        set(() => ({
            isProfileSet: true,
            profile: newProfile
        }))
    },
    cleanUserProfile: () => {
        set(() => (
            {
            isProfileSet: false,
            profile: null,
        }))
    }
}))

export default useUserStore;
