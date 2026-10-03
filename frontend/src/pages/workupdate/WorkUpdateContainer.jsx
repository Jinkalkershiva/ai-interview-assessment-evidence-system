import React, { useState } from 'react';
import WorkUpdateCreate from './WorkUpdateCreate.jsx';
import WorkUpdateSession from './WorkUpdateSession.jsx';
import WorkUpdateReportView from './WorkUpdateReportView.jsx';

export default function WorkUpdateContainer({ onNavigateToDashboard }) {
  const [step, setStep] = useState('create'); // 'create' | 'session' | 'report'
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeToken, setActiveToken] = useState(null);
  const [reportData, setReportData] = useState(null);

  const handleRoomCreated = (roomId, token) => {
    setActiveRoomId(roomId);
    setActiveToken(token);
    setStep('session');
  };

  const handleSessionCompleted = (data) => {
    setReportData(data);
    setStep('report');
  };

  const handleReset = () => {
    setActiveRoomId(null);
    setActiveToken(null);
    setReportData(null);
    setStep('create');
  };

  return (
    <div className="flex-col" style={{ flex: 1, width: '100%' }}>
      {step === 'create' && (
        <WorkUpdateCreate 
          onRoomCreated={handleRoomCreated} 
          onGoToDashboard={onNavigateToDashboard} 
        />
      )}

      {step === 'session' && activeRoomId && (
        <WorkUpdateSession 
          roomId={activeRoomId} 
          token={activeToken} 
          onSessionCompleted={handleSessionCompleted}
          onExit={handleReset}
        />
      )}

      {step === 'report' && reportData && (
        <WorkUpdateReportView 
          roomData={reportData} 
          token={activeToken} 
          onBack={handleReset} 
        />
      )}
    </div>
  );
}
