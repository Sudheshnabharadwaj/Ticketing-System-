import React from 'react';
import { SignupPage } from './SignupPage';

/**
 * Dedicated Employee Portal Sign-Up Page
 * URL: /employee/signup and /employee/auth/signup
 */
export const EmployeeSignUpPage: React.FC = () => {
  return <SignupPage defaultPortal="employee" />;
};
