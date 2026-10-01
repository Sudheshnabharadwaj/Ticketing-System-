import React from 'react';
import { SignupPage } from './SignupPage';

/**
 * Dedicated Admin Portal Sign-Up Page
 * URL: /admin/signup and /admin/auth/signup
 */
export const AdminSignUpPage: React.FC = () => {
  return <SignupPage defaultPortal="admin" />;
};
