import { Outlet, Navigate } from 'react-router-dom'
import { accessTokenIsValid } from '~/services/session'
import { consumeAuthReturnTo } from '~/services/auth/returnTo'
import { DASHBOARD } from '~/router/paths';

const PublicRoute = () => {
    if (accessTokenIsValid()) {
        return <Navigate to={consumeAuthReturnTo(DASHBOARD)} replace />;
    }
    return <Outlet />;
}

export default PublicRoute