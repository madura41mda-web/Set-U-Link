import { useAuth } from '../context/AuthContext.jsx';

/**
 * RoleGate component for role-based view access control.
 *
 * @param {Object} props
 * @param {Array<string>|string} props.allowedRoles - Role(s) allowed to view children (e.g. ['admin'], ['admin', 'org_rep'])
 * @param {React.ReactNode} props.children - Content rendered if role is authorized
 * @param {React.ReactNode} [props.fallback=null] - Optional fallback UI when unauthorized
 */
export default function RoleGate({ allowedRoles = ['admin'], children, fallback = null }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const userRole = profile?.role || 'citizen';

  const isAuthorized = rolesArray.includes(userRole);

  if (!isAuthorized) {
    return fallback;
  }

  return children;
}
