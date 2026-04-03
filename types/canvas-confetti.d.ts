declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    scalar?: number;
    shapes?: ("square" | "circle")[];
    colors?: string[];
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  export default function confetti(options?: ConfettiOptions): void;
}

