import { Navigate, createBrowserRouter } from 'react-router'

import { AuthLayout } from '@/shared/components/layouts/AuthLayout'
import { AuthGuard } from '@/features/auth/guards/AuthGuard'
import { GoogleSuccessGuard } from '@/features/auth/guards/GoogleSuccessGuard'
import { GuestGuard } from '@/features/auth/guards/GuestGuard'
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import { MyCvDetailPage } from '@/features/cv-library/pages/MyCvDetailPage'
import { MyCvsPage } from '@/features/cv-library/pages/MyCvsPage'
import { ResearchCvPage } from '@/features/cv-research/pages/ResearchCvPage'
import { ResearchSessionDetailPage } from '@/features/cv-research/pages/ResearchSessionDetailPage'
import { JobFeedPage } from '@/features/job-research/pages/JobFeedPage'
import { ResearchHistoryPage } from '@/features/job-research/pages/ResearchHistoryPage'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { AdminGuard } from '@/features/admin/guards/AdminGuard'
import { AdminLayout } from '@/features/admin/components/admin-layout'
import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage'
import { AdminUserDetailPage } from '@/features/admin/pages/AdminUserDetailPage'
import { AdminCrawlsPage } from '@/features/admin/pages/AdminCrawlsPage'
import { AdminPricingPage } from '@/features/admin/pages/AdminPricingPage'
import { AdminCrawlDetailPage } from '@/features/admin/pages/AdminCrawlDetailPage'
import { JobFitResultPage } from '@/features/job-fit/pages/JobFitResultPage'
import { PricingPage } from '@/features/landing/pages/PricingPage'
import { PublicJobsPage } from '@/features/landing/pages/PublicJobsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'viec-lam', element: <PublicJobsPage /> },
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
            lazy: async () => ({ Component: (await import('@/features/dashboard/pages/DashboardPage')).DashboardPage }),
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
            element: <Navigate to="/research-history" replace />,
          },
          {
            path: '/research/new',
            element: <ResearchCvPage />,
          },
          {
            path: '/jobs',
            element: <JobFeedPage />,
          },
          {
            path: '/jobs/:jobId/fit/:analysisId',
            element: <JobFitResultPage />,
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
  {
    path: '/admin/login',
    element: <Navigate to="/login?redirect=%2Fadmin" replace />,
  },
  {
    element: <AdminGuard />,
    children: [{
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { index: true, lazy: async () => ({ Component: (await import('@/features/admin/pages/AdminDashboardPage')).AdminDashboardPage }) },
        { path: 'users', element: <AdminUsersPage /> },
        { path: 'users/:userId', element: <AdminUserDetailPage /> },
        { path: 'crawls', element: <AdminCrawlsPage /> },
        { path: 'crawls/:crawlId', element: <AdminCrawlDetailPage /> },
        { path: 'pricing', element: <AdminPricingPage /> },
      ],
    }],
  },
])
