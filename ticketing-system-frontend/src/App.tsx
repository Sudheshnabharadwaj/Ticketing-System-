import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TicketProvider } from './context/TicketContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TicketProvider>
          <AppRoutes />
        </TicketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
