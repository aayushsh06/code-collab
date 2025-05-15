import { useEffect, useState } from 'react';

export const useBlink = (interval = 1500) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const step = () => {
      setVisible(prev => !prev);
    };
    const id = setInterval(step, interval / 2); 
    return () => clearInterval(id);
  }, [interval]);

  return visible;
};