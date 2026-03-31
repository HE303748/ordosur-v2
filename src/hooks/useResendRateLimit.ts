import { useState, useCallback } from 'react';

interface RateLimitState {
  isDisabled: boolean;
  secondsRemaining: number;
}

export function useResendRateLimit(delaySeconds: number = 60) {
  const [state, setState] = useState<RateLimitState>({
    isDisabled: false,
    secondsRemaining: 0,
  });

  const startCooldown = useCallback(() => {
    setState({
      isDisabled: true,
      secondsRemaining: delaySeconds,
    });

    const interval = setInterval(() => {
      setState(prev => {
        const newSeconds = prev.secondsRemaining - 1;
        if (newSeconds <= 0) {
          clearInterval(interval);
          return { isDisabled: false, secondsRemaining: 0 };
        }
        return { ...prev, secondsRemaining: newSeconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [delaySeconds]);

  return { ...state, startCooldown };
}
