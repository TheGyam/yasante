import React, { ReactNode, useEffect, useRef } from 'react';
import { View, Animated as RNAnimated } from 'react-native';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export const FadeInView: React.FC<FadeInProps> = ({ 
  children, 
  delay = 0, 
  duration = 300 
}) => {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration]);

  return (
    <RNAnimated.View style={{ opacity: fadeAnim }}>
      {children}
    </RNAnimated.View>
  );
};

