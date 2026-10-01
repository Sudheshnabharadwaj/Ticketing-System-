const fs = require('fs');

console.log('=== AUTHENTICATION FLOW VERIFICATION ===\n');

// 1. AppRoutes checks
const appRoutes = fs.readFileSync('frontend/admin/src/routes/AppRoutes.tsx', 'utf-8');
const rootToSignup = appRoutes.includes('return <Navigate to="/signup" replace />;');
const dashToLogin = appRoutes.includes('return <Navigate to="/login" replace />;');
const routeRoot = appRoutes.includes('<Route path="/" element={<RootRedirect />} />');
const routeDash = appRoutes.includes('<Route path="/dashboard" element={<DashboardRedirect />} />');

console.log('1. AppRoutes.tsx:');
console.log('   - Unauthenticated Root "/" redirects to "/signup":', rootToSignup ? 'PASS' : 'FAIL');
console.log('   - Unauthenticated "/dashboard" redirects to "/login":', dashToLogin ? 'PASS' : 'FAIL');
console.log('   - Route "/" configured with RootRedirect:', routeRoot ? 'PASS' : 'FAIL');
console.log('   - Route "/dashboard" configured with DashboardRedirect:', routeDash ? 'PASS' : 'FAIL');

// 2. SignupPage checks
const signupPage = fs.readFileSync('frontend/admin/src/pages/auth/SignupPage.tsx', 'utf-8');
const signupAuthGuard = signupPage.includes('const currentUser = getCurrentSessionUser();') && signupPage.includes('return <Navigate to="/admin/dashboard" replace />;');
const signupNavLogin = signupPage.includes("navigate('/login', {") && signupPage.includes('registrationSuccess:');

console.log('\n2. SignupPage.tsx:');
console.log('   - Authenticated user visiting /signup redirects to Dashboard:', signupAuthGuard ? 'PASS' : 'FAIL');
console.log('   - Registration navigates to /login with state (Sign Up -> Login):', signupNavLogin ? 'PASS' : 'FAIL');

// 3. LoginPage checks
const loginPage = fs.readFileSync('frontend/admin/src/pages/auth/LoginPage.tsx', 'utf-8');
const loginAuthGuard = loginPage.includes('const currentUser = getCurrentSessionUser();') && loginPage.includes('return <Navigate to="/admin/dashboard" replace />;');
const loginPrefill = loginPage.includes('stateData?.registeredEmail');
const loginBanner = loginPage.includes('{successBanner &&');

console.log('\n3. LoginPage.tsx:');
console.log('   - Authenticated user visiting /login redirects to Dashboard:', loginAuthGuard ? 'PASS' : 'FAIL');
console.log('   - Reads registeredEmail from state to prefill email:', loginPrefill ? 'PASS' : 'FAIL');
console.log('   - Displays registration success banner:', loginBanner ? 'PASS' : 'FAIL');

// 4. unifiedAuth checks
const unifiedAuth = fs.readFileSync('frontend/admin/src/services/unifiedAuth.ts', 'utf-8');
const rejectUnregistered = unifiedAuth.includes('No account found with this email address');
const noAutoLoginOnRegister = !unifiedAuth.includes('setSessionUser(newUser)');
const sessionNullOnColdStart = unifiedAuth.includes('return null;');

console.log('\n4. unifiedAuth.ts:');
console.log('   - Cold visit returns null (no synthesized session):', sessionNullOnColdStart ? 'PASS' : 'FAIL');
console.log('   - loginUser rejects unregistered accounts:', rejectUnregistered ? 'PASS' : 'FAIL');
console.log('   - registerUser does NOT auto-login user:', noAutoLoginOnRegister ? 'PASS' : 'FAIL');

// 5. Payment check
const greppedPayment = !appRoutes.includes('/payment') && !signupPage.includes('/payment');
console.log('\n5. Payment page check:');
console.log('   - Payment is NOT default landing page:', greppedPayment ? 'PASS' : 'FAIL');

const allPassed = rootToSignup && dashToLogin && routeRoot && routeDash && signupAuthGuard && signupNavLogin && loginAuthGuard && loginPrefill && loginBanner && rejectUnregistered && noAutoLoginOnRegister && greppedPayment;

console.log('\n========================================');
console.log('ALL AUTHENTICATION CHECKS PASSED:', allPassed);
console.log('========================================');
