import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateTicketModal } from '../../components/tickets/CreateTicketModal';

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <CreateTicketModal
      isOpen={true}
      onClose={() => navigate('/teamlead/dashboard')}
      onSuccess={() => {
        navigate('/teamlead/team-tickets');
      }}
    />
  );
};

export default CreateTicketPage;

