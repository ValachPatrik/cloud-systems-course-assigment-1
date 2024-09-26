import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ConnectionStatusProps {
  onStatusChange: (isOnline: boolean, isServerOnline: boolean) => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onStatusChange }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServerOnline, setIsServerOnline] = useState(true);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        await axios.get('/api/health');
        setIsServerOnline(true);
      } catch (error) {
        setIsServerOnline(false);
      }
    };

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const intervalId = setInterval(checkServerStatus, 1000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    onStatusChange(isOnline, isServerOnline);
  }, [isOnline, isServerOnline, onStatusChange]);

  return (
    <div className={`status ${isOnline && isServerOnline ? 'online' : 'offline'}`}>
      {isOnline && isServerOnline ? 'Online' : 'Offline'}
    </div>
  );
};

export default ConnectionStatus;