import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated as RNAnimated } from 'react-native';

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  scale?: number;
}

export const ScaleInView: React.FC<ScaleInProps> = ({ 
  children, 
  delay = 0,
  scale = 0.95,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(scale)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 15,
        }),
        RNAnimated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, scale]);

  return (
    <RNAnimated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      {children}
    </RNAnimated.View>
  );
};

