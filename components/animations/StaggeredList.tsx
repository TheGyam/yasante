import React, { ReactNode } from 'react';
import { FadeInView } from './FadeIn';

interface StaggeredListProps {
  children: ReactNode[];
  delay?: number;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({ 
  children, 
  delay = 50 
}) => {
  return (
    <>
      {children.map((child, index) => (
        <FadeInView key={index} delay={index * delay} duration={400}>
          {child}
        </FadeInView>
      ))}
    </>
  );
};

