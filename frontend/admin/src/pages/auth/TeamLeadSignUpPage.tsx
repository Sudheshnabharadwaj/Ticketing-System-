import React from 'react';
import { SignupPage } from './SignupPage';

/**
 * Dedicated Team Lead Portal Sign-Up Page
 * URL: /teamlead/signup and /teamlead/auth/signup
 */
export const TeamLeadSignUpPage: React.FC = () => {
  return <SignupPage defaultPortal="teamlead" />;
};
