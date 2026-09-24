import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { accessTokenIsValid } from '~/services/session'
import { rememberAuthReturnTo } from '~/services/auth/returnTo'
import { LOGOUT } from '~/router/paths'
import { useUserStore } from '~/store'
import useRetrieveUser from '~/api/user/retrieveUser'
import { useEffect, useRef, useState } from 'react'
import { setAppLocale } from '~/i18n'
import { isAppLocale, NETWORK_ERROR } from '~/util/constants'
import AppLoading from '~/components/AppLoading'

const RestrictedRoute = () => {
    const [hasError, setHasError] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const locationRef = useRef(location);
    locationRef.current = location;
    const { isProfileSet, setUserProfile } = useUserStore()
    const { response, mutate, isLoading, isValidating } = useRetrieveUser()
    const syncedLocaleUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if(hasError || isLoading || isValidating) {
            return
        }
        if(!response?.data) {
            // No cached profile yet (or empty) — fetch once. Logout clears the SWR cache,
            // so a new session does not reuse a previous user's role.
            mutate().catch((error: AxiosError) => {
                if (error.code === NETWORK_ERROR) {
                    return;
                }
                setHasError(true);
                const { pathname, search } = locationRef.current;
                rememberAuthReturnTo(`${pathname}${search}`);
                navigate(LOGOUT);
            })
            return
        }
        setUserProfile(response.data as any);

        // Apply the account locale once per user session. Re-applying on every navigation
        // (or on a stale /me cache after the user changed language) was resetting i18n.
        const userId = response.data.id;
        if (
            userId
            && syncedLocaleUserIdRef.current !== userId
            && isAppLocale(response.data.locale)
        ) {
            syncedLocaleUserIdRef.current = userId;
            setAppLocale(response.data.locale);
        }
    }, [response, hasError, isLoading, isValidating, mutate, navigate, setUserProfile])

    if (!accessTokenIsValid()) {
        rememberAuthReturnTo(`${location.pathname}${location.search}`);
        return <Navigate to={LOGOUT} replace />;
    }

    // Wait for profile/role before mounting the authenticated shell so customer vs
    // staff layouts never flash through the wrong chrome.
    if (!isProfileSet) {
        return <AppLoading className="h-dvh" />;
    }

    return <Outlet />;
}

export default RestrictedRoute
