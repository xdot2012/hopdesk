import { createBrowserRouter } from "react-router-dom"
import { Navigate } from "react-router-dom";
import paths, {
  INDICATORS,
  USER_SECTORS,
  KNOWLEDGE_BASE,
  SERVICE_LEVEL_AGREEMENT_LEGACY,
  SLA,
  TICKET_NEW,
  TICKETS,
  TICKETS_HISTORY,
} from "./paths";

import Layout from "../pages/Dashboard/Layout";
import AuthLayout from "../pages/Auth/Layout";

import PageNotFound from "../pages/PageNotFound";
import ConnectionErrorPage from "../pages/ConnectionError";

import SignInPage from "../pages/Auth/SignIn";
import SignupPage from "../pages/Auth/SignUp";
import LogoutPage from "../pages/Auth/Logout";
import PasswordRecovery from "../pages/Auth/ForgotPassword";
import PasswordReset from "../pages/Auth/PasswordReset";
import ConfirmEmail from "../pages/Auth/ConfirmEmail";
import RestrictedRoute from "./Templates/RestrictedRoute";
import PublicRoute from "./Templates/PublicRoute";
import RoleRoute from "./Templates/RoleRoute";
import { isAdminRole, isAgentRole, isCustomerRole } from "../util/roles";

import DashboardPage from "../pages/Dashboard";
import SettingsPage from "../pages/Settings";
import UserSettingsPage from "../pages/UserSettings";
import TicketsPage from "../pages/Tickets";
import TicketsHistoryPage from "../pages/Tickets/History";
import NewTicketPage from "../pages/Tickets/New";
import TicketDetailPage from "../pages/Tickets/Detail";
import KnowledgeBaseDeepLinkPage from "../pages/KnowledgeBase/DeepLink";
import SlaPage from "../pages/Sla";
import UserSectorsPage from "../pages/UserSectors";
import IndicatorsPage from "../pages/Indicators";
import BrandIdentityPage from "../pages/Dev/BrandIdentity";


const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    errorElement: <PageNotFound />,
    children: [
    {
      path: "/auth",
      element: <AuthLayout />,
      children: [
        {
            path: paths.SIGN_IN,
            element: <SignInPage />
        },
        {
            path: paths.SIGN_UP,
            element: <SignupPage />
        },
        {
            path: paths.FORGOT_PASSWORD,
            element: <PasswordRecovery />
        },
        {
            path: `${paths.RESET_PASSWORD}/:code`,
            element: <PasswordReset />
        },
      ]
    }],
  },
  {
    element: <RestrictedRoute />,
    errorElement: <PageNotFound />,
    children: [
      {
        element: <Layout />,
        children: [
          {
              path: paths.DASHBOARD,
              element: <DashboardPage />
          },
          {
              path: paths.SETTINGS,
              element: <SettingsPage />
          },
          {
              path: paths.USER_SETTINGS,
              element: <UserSettingsPage />
          },
          {
              path: TICKETS,
              element: <TicketsPage />
          },
          {
              path: TICKETS_HISTORY,
              element: <TicketsHistoryPage />
          },
          {
              element: <RoleRoute allow={isCustomerRole} />,
              children: [
                {
                    path: TICKET_NEW,
                    element: <NewTicketPage />
                },
              ],
          },
          {
              path: `${TICKETS}/:id`,
              element: <TicketDetailPage />
          },
          {
              path: KNOWLEDGE_BASE,
              children: [
                {
                  index: true,
                  element: <KnowledgeBaseDeepLinkPage />,
                },
                {
                  element: <RoleRoute allow={isAgentRole} />,
                  children: [
                    {
                      path: "new",
                      element: <KnowledgeBaseDeepLinkPage />,
                    },
                  ],
                },
                {
                  path: ":id",
                  children: [
                    {
                      index: true,
                      element: <KnowledgeBaseDeepLinkPage />,
                    },
                    {
                      element: <RoleRoute allow={isAgentRole} />,
                      children: [
                        {
                          path: "edit",
                          element: <KnowledgeBaseDeepLinkPage />,
                        },
                      ],
                    },
                  ],
                },
              ],
          },
          {
              element: <RoleRoute allow={isAgentRole} />,
              children: [
                {
                    path: SLA,
                    element: <SlaPage />
                },
                {
                    path: SERVICE_LEVEL_AGREEMENT_LEGACY,
                    element: <SlaPage />
                },
              ],
          },
          {
              element: <RoleRoute allow={isAdminRole} />,
              children: [
                {
                    path: USER_SECTORS,
                    element: <UserSectorsPage />
                },
                {
                    path: "/portal-members",
                    element: <UserSectorsPage />
                },
                {
                    path: INDICATORS,
                    element: <IndicatorsPage />
                },
              ],
          },
        ]
      },
    ]
  },
  {
    path: paths.BRAND_IDENTITY,
    element: <BrandIdentityPage />,
  },
  {
    path: "/dev/brand-preview",
    element: <Navigate to={paths.BRAND_IDENTITY} replace />,
  },
  {
    path: paths.CONNECTION_ERROR,
    element: <ConnectionErrorPage />,
  },
  {
    path: paths.LOGOUT,
    element: <LogoutPage />
  },
  {
    path: `${paths.CONFIRM_EMAIL}/:code`,
    element: <ConfirmEmail />
  },
]);

export default router;
