/**
 * Marketplace Login page — server component
 *
 * SiteMedic Marketplace branded (no org branding / subdomain logic).
 */

import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
