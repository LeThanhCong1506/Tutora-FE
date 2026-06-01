import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  deadline: string;
  onExpired?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ deadline, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Đã hết hạn');
        setIsExpired(true);
        onExpired?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`Còn ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`Còn ${minutes}m`);
      }
    };

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [deadline, onExpired]);

  return (
    <span style={{
      fontSize: '12px',
      fontWeight: 600,
      color: isExpired ? '#ff4d4f' : '#faad14',
      background: isExpired ? '#fff2f0' : '#fffbe6',
      padding: '2px 8px',
      borderRadius: '4px',
    }}>
      {timeLeft}
    </span>
  );
};

export default CountdownTimer;
