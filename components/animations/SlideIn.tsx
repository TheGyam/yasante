import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated as RNAnimated } from 'react-native';

interface SlideInProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export const SlideInView: React.FC<SlideInProps> = ({ 
  children, 
  delay = 0,
  direction = 'up',
  distance = 20,
}) => {
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const initialX = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
    const initialY = direction === 'up' ? distance : direction === 'down' ? -distance : 0;
    
    translateX.setValue(initialX);
    translateY.setValue(initialY);

    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 150,
          friction: 15,
        }),
        RNAnimated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 150,
          friction: 15,
        }),
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, direction, distance]);

  return (
    <RNAnimated.View
      style={{
        transform: [
          { translateX },
          { translateY },
        ],
        opacity,
      }}
    >
      {children}
    </RNAnimated.View>
  );
};

