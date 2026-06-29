import React from 'react';

const ANIMATIONS = {
  classic: `
    @keyframes bounce-1 { 0%, 100% { height: 20%; } 50% { height: 100%; } }
    .bar-1 { animation: bounce-1 0.8s infinite ease-in-out; animation-delay: -0.4s; }
    .bar-2 { animation: bounce-1 0.8s infinite ease-in-out; animation-delay: -0.2s; }
    .bar-3 { animation: bounce-1 0.8s infinite ease-in-out; animation-delay: 0s; }
  `,
  
  wave: `
    @keyframes wave { 0%, 40%, 100% { height: 20%; } 20% { height: 100%; } }
    .bar-1 { animation: wave 1s infinite ease-in-out; animation-delay: 0s; }
    .bar-2 { animation: wave 1s infinite ease-in-out; animation-delay: 0.1s; }
    .bar-3 { animation: wave 1s infinite ease-in-out; animation-delay: 0.2s; }
  `,

  pulse: `
    @keyframes pulse-audio { 0% { height: 10%; } 50% { height: 100%; } 100% { height: 10%; } }
    .bar-1 { animation: pulse-audio 0.6s infinite ease-in-out; }
    .bar-2 { animation: pulse-audio 0.6s infinite ease-in-out; animation-delay: 0.1s; }
    .bar-3 { animation: pulse-audio 0.6s infinite ease-in-out; }
  `,

  digital: `
    @keyframes digital { 0% { height: 30%; } 33% { height: 100%; } 66% { height: 50%; } 100% { height: 30%; } }
    .bar-1 { animation: digital 0.5s infinite steps(3); animation-delay: 0s; }
    .bar-2 { animation: digital 0.5s infinite steps(3); animation-delay: 0.25s; }
    .bar-3 { animation: digital 0.5s infinite steps(3); animation-delay: 0.1s; }
  `
};

interface Props {
  type?: 'classic' | 'wave' | 'pulse' | 'digital';
  color?: string;
  className?: string;
}

const PlayingIcon: React.FC<Props> = ({ type = 'classic', color = 'bg-primary', className }) => {
  return (
    <>
      <style>{ANIMATIONS[type]}</style>
      <div className={`flex items-end justify-center gap-[2px] w-[14px] h-[14px] ${className}`}>
        <span className={`w-[3px] rounded-sm ${color} bar-1`}></span>
        <span className={`w-[3px] rounded-sm ${color} bar-2`}></span>
        <span className={`w-[3px] rounded-sm ${color} bar-3`}></span>
      </div>
    </>
  );
};

export default PlayingIcon;