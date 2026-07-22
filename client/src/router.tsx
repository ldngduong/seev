import { createBrowserRouter } from 'react-router'

import { AuthLayout } from './components/layouts/AuthLayout'
import { GuestLayout } from './components/layouts/GuestLayout'
import { GoogleSuccessGuard } from './features/auth/guards/GoogleSuccessGuard'
import { AuthGuard } from './features/auth/guards/AuthGuard'
import { GuestGuard } from './features/auth/guards/GuestGuard'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ItemsPage } from './features/dashboard/ItemsPage'
import { MyCvDetailPage } from './features/cv-library/MyCvDetailPage'
import { MyCvsPage } from './features/cv-library/MyCvsPage'
import { ResearchCvPage } from './features/cv-research/ResearchCvPage'
import { ResearchSessionDetailPage } from './features/cv-research/ResearchSessionDetailPage'
import { ResearchHistoryPage } from './features/job-research/ResearchHistoryPage'
import { LandingPage } from './features/landing/LandingPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GuestLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        element: <GuestGuard />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'auth/google/success',
            element: <GoogleSuccessGuard />,
          },
        ],
      },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/items',
            element: <ItemsPage />,
          },
          {
            path: '/my-cvs',
            element: <MyCvsPage />,
          },
          {
            path: '/my-cvs/:cvId',
            element: <MyCvDetailPage />,
          },
          {
            path: '/research-cv',
            element: <ResearchCvPage />,
          },
          {
            path: '/research-history',
            element: <ResearchHistoryPage />,
          },
          {
            path: '/research-history/:sessionId',
            element: <ResearchSessionDetailPage />,
          },
        ],
      },
    ],
  },
])
