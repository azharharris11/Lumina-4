
import React from 'react';
import { Booking, ActivityLog } from '../../types';
import { useStudio } from '../../contexts/StudioContext';
import ContractViewer from '../ContractViewer';

interface ProjectContractProps {
  booking: Booking;
  onUpdateBooking: (booking: Booking) => void;
  createLocalLog: (action: string, details?: string) => ActivityLog;
}

const ProjectContract: React.FC<ProjectContractProps> = ({ booking, onUpdateBooking, createLocalLog }) => {
  const { config } = useStudio();

  const handleSign = async (signatureUrl: string) => {
      onUpdateBooking({
          ...booking,
          contractStatus: 'SIGNED',
          contractSignedDate: new Date().toISOString(),
          contractSignature: signatureUrl,
          logs: [createLocalLog('CONTRACT_SIGNED', 'Digital signature uploaded via Admin Panel'), ...(booking.logs || [])]
      });
      alert("Contract Signed Successfully!");
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full">
        <ContractViewer 
            booking={booking} 
            config={config} 
            onSign={handleSign}
            readOnly={false} // Admin can always sign if needed
        />
    </div>
  );
};

export default ProjectContract;
