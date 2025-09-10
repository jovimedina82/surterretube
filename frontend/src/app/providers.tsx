'use client'
import React, { useMemo } from 'react'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication, type Configuration, LogLevel } from '@azure/msal-browser'

export default function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_AAD_CLIENT_ID!
  const tenantId = process.env.NEXT_PUBLIC_AAD_TENANT_ID!
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : undefined)

  // Hard-fail if misconfigured so we don’t render a public home by mistake
  if (!clientId || !tenantId || !redirectUri) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-700 p-6 text-center">
        <div>
          <div className="font-medium mb-2">Azure AD is not configured</div>
          <div>Set <code>NEXT_PUBLIC_AAD_CLIENT_ID</code>, <code>NEXT_PUBLIC_AAD_TENANT_ID</code> and <code>NEXT_PUBLIC_REDIRECT_URI</code> in <code>.env.local</code>, then rebuild.</div>
        </div>
      </div>
    )
  }

  const pca = useMemo(() => {
    if (typeof window === 'undefined') return null
    const config: Configuration = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri,
        postLogoutRedirectUri: redirectUri,
        navigateToLoginRequestUrl: true,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true, // helps Safari/ITP
      },
      system: {
        loggerOptions: {
          logLevel: LogLevel.Error,
          loggerCallback: () => {},
        },
      },
    }
    return new PublicClientApplication(config)
  }, [clientId, tenantId, redirectUri])

  return pca ? <MsalProvider instance={pca}>{children}</MsalProvider> : <>{children}</>
}
