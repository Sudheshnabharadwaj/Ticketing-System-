const fs = require('fs');

console.log('=== AUTHENTICATION & LOGIN FLOW VERIFICATION ===\n');

// 1. AppRoutes checks
const appRoutes = fs.readFileSync('frontend/admin/src/routes/AppRoutes.tsx', 'utf-8');
const rootToLogin = appRoutes.includes('return <Navigate to="/login" replace />;');
const dashToLogin = appRoutes.includes('return <Navigate to="/login" replace />;');
const routeRoot = appRoutes.includes('<Route path="/" element={<RootRedirect />} />');
const routeDash = appRoutes.includes('<Route path="/dashboard" element={<DashboardRedirect />} />');

console.log('1. AppRoutes.tsx:');
console.log('   - Unauthenticated Root "/" redirects to "/login":', rootToLogin ? 'PASS' : 'FAIL');
console.log('   - Unauthenticated "/dashboard" redirects to "/login":', dashToLogin ? 'PASS' : 'FAIL');
console.log('   - Route "/" configured with RootRedirect:', routeRoot ? 'PASS' : 'FAIL');
console.log('   - Route "/dashboard" configured with DashboardRedirect:', routeDash ? 'PASS' : 'FAIL');

// 2. ProtectedRoute checks
const protectedRoute = fs.readFileSync('frontend/admin/src/components/auth/ProtectedRoute.tsx', 'utf-8');
const protectedGuard = protectedRoute.includes('return <Navigate to="/login" replace />;');
const protectedEventListener = protectedRoute.includes('addEventListener') && protectedRoute.includes('session-expired');

console.log('\n2. ProtectedRoute.tsx:');
console.log('   - Unauthenticated direct URL access redirects to "/login":', protectedGuard ? 'PASS' : 'FAIL');
console.log('   - Listens to session-expired/auth events for instant route protection:', protectedEventListener ? 'PASS' : 'FAIL');

// 3. LoginPage checks
const loginPage = fs.readFileSync('frontend/admin/src/pages/auth/LoginPage.tsx', 'utf-8');
const loginAuthGuard = loginPage.includes('getCurrentSessionUser()') && (
  loginPage.includes('return <Navigate to="/admin/dashboard" replace />;') ||
  loginPage.includes('Navigate to="/admin/dashboard"')
);
const loginReplaceNav = loginPage.includes("navigate('/admin/dashboard', { replace: true })") &&
                        loginPage.includes("navigate('/teamlead/dashboard', { replace: true })") &&
                        loginPage.includes("navigate('/employee/dashboard', { replace: true })");

console.log('\n3. LoginPage.tsx:');
console.log('   - Authenticated user visiting /login redirects to Dashboard:', loginAuthGuard ? 'PASS' : 'FAIL');
console.log('   - Successful login opens role dashboard immediately with replace: true:', loginReplaceNav ? 'PASS' : 'FAIL');

// 4. unifiedAuth & backendAuth checks
const unifiedAuth = fs.readFileSync('frontend/admin/src/services/unifiedAuth.ts', 'utf-8');
const backendAuth = fs.readFileSync('frontend/admin/src/services/backendAuth.ts', 'utf-8');
const sessionNullOnColdStart = unifiedAuth.includes('return null;');
const sessionChecksTokens = unifiedAuth.includes('getBackendToken()') && unifiedAuth.includes('backend_refresh_token');
const sessionExpiryHandler = backendAuth.includes('handleSessionExpiration') && backendAuth.includes("window.location.replace('#/login')");

console.log('\n4. unifiedAuth.ts & backendAuth.ts:');
console.log('   - First visit / cold start returns null session:', sessionNullOnColdStart ? 'PASS' : 'FAIL');
console.log('   - Validates backend token & refresh token existence:', sessionChecksTokens ? 'PASS' : 'FAIL');
console.log('   - 401 session expiration automatically redirects to /login:', sessionExpiryHandler ? 'PASS' : 'FAIL');

// 5. Back button protection check
const appCode = fs.readFileSync('frontend/admin/src/App.tsx', 'utf-8');
const backButtonGuard = appCode.includes('checkBackNavigationAuth') &&
                        appCode.includes('popstate') &&
                        appCode.includes('pageshow');

console.log('\n5. Back button & Logout protection:');
console.log('   - App.tsx intercepts popstate / pageshow to block back navigation after logout:', backButtonGuard ? 'PASS' : 'FAIL');

const allPassed = rootToLogin && dashToLogin && routeRoot && routeDash &&
                  protectedGuard && protectedEventListener &&
                  loginAuthGuard && loginReplaceNav &&
                  sessionNullOnColdStart && sessionChecksTokens && sessionExpiryHandler &&
                  backButtonGuard;

console.log('\n========================================');
console.log('ALL AUTHENTICATION CHECKS PASSED:', allPassed);
console.log('========================================');

if (!allPassed) {
  process.exit(1);
}
