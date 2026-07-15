import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute — token + role gating.
 *
 * Phase-1 mock-auth note: real credential verification and role claims must be
 * enforced server-side once the backend is built ([JWT] GET /api/auth/me).
 * Until then we enforce persona → panel gating on the client using the role
 * persisted at login (`4ds_role`), so a partner/customer login cannot reach
 * Tower/Bridge/ERP admin screens even by URL guessing.
 */

export type AppRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'bridge_ops'
  | 'partner'
  | 'customer';

/** Path-prefix → roles allowed to enter that panel. */
const PANEL_ACL: ReadonlyArray<{ prefix: string; roles: readonly AppRole[] }> = [
  { prefix: '/tower',    roles: ['super_admin', 'tenant_admin'] },
  { prefix: '/bridge',   roles: ['super_admin', 'bridge_ops', 'tenant_admin'] },
  { prefix: '/partner',  roles: ['super_admin', 'partner'] },
  { prefix: '/customer', roles: ['super_admin', 'customer'] },
  // ERP surface (admin/operations). Partners/customers may not enter.
  { prefix: '/erp',           roles: ['super_admin', 'tenant_admin', 'bridge_ops'] },
  { prefix: '/prudent360',    roles: ['super_admin', 'tenant_admin', 'bridge_ops'] },
  { prefix: '/operix-go',     roles: ['super_admin', 'tenant_admin', 'bridge_ops'] },
  { prefix: '/verticals',     roles: ['super_admin', 'tenant_admin', 'bridge_ops'] },
  { prefix: '/modules',       roles: ['super_admin', 'tenant_admin', 'bridge_ops'] },
  { prefix: '/add-ons',       roles: ['super_admin', 'tenant_admin', 'bridge_ops'] },
];

/** Home landing per role (used when a mismatched persona tries a foreign panel). */
const ROLE_HOME: Record<AppRole, string> = {
  super_admin:  '/welcome',
  tenant_admin: '/welcome',
  bridge_ops:   '/bridge/dashboard',
  partner:      '/partner/dashboard',
  customer:     '/customer/dashboard',
};

function readRole(): AppRole | null {
  try {
    const r = localStorage.getItem('4ds_role');
    if (!r) return null;
    if (['super_admin', 'tenant_admin', 'bridge_ops', 'partner', 'customer'].includes(r)) {
      return r as AppRole;
    }
    return null;
  } catch {
    return null;
  }
}

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  /** Optional explicit role gate for a specific route. */
  roles?: readonly AppRole[];
}) {
  const location = useLocation();
  // [JWT] Replace with real token + role validation via GET /api/auth/me
  const token = localStorage.getItem('4ds_token');
  if (!token) return <Navigate to="/auth/login" replace />;

  const role = readRole();
  const home = role ? ROLE_HOME[role] : '/welcome';

  // Explicit per-route gate wins.
  if (roles && roles.length > 0) {
    if (!role || !roles.includes(role)) {
      return <Navigate to={home} replace />;
    }
    return <>{children}</>;
  }

  // Otherwise apply panel ACL by pathname prefix.
  const acl = PANEL_ACL.find((p) => location.pathname.startsWith(p.prefix));
  if (acl) {
    if (!role || !acl.roles.includes(role)) {
      return <Navigate to={home} replace />;
    }
  }

  return <>{children}</>;
}
