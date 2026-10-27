// @ts-nocheck -- composant tiers copié tel quel, typé pour React 18 / TS 5
'use client';
import { cn } from '@/lib/utils';
import { motion, SpringOptions, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';

export type AnimatedNumberProps = {
  value: number;
  className?: string;
  springOptions?: SpringOptions;
  as?: React.ElementType;
  decimales?: number; // ajout projet : affichage français avec décimales
};

export function AnimatedNumber({
  value,
  className,
  springOptions,
  as = 'span',
  decimales = 0,
}: AnimatedNumberProps) {
  const MotionComponent = motion.create(as as keyof JSX.IntrinsicElements);

  const spring = useSpring(value, springOptions);
  const display = useTransform(spring, (current) =>
    current.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <MotionComponent className={cn('tabular-nums', className)}>
      {display}
    </MotionComponent>
  );
}