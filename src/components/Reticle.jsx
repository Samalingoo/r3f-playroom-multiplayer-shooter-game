import { useState, useEffect } from 'react';
import { myPlayer } from 'playroomkit';

const Reticle = ({ color = 'rgba(255, 255, 255, 0.8)', size = 20 }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const checkGameStatus = () => {
      const player = myPlayer();
      setIsVisible(!!player);
    };
    
    // Check initially and every 1 second
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 1000);
    
    // Add pointer lock event listeners to show/hide reticle
    const handlePointerLockChange = () => {
      setIsVisible(document.pointerLockElement !== null);
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 999,
        pointerEvents: 'none',
      }}
    >
      {/* Horizontal line */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '0',
        width: '100%',
        height: '2px',
        backgroundColor: color,
        transform: 'translateY(-50%)',
      }} />
      
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '50%',
        width: '2px',
        height: '100%',
        backgroundColor: color,
        transform: 'translateX(-50%)',
      }} />
      
      {/* Center dot */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '4px',
        height: '4px',
        backgroundColor: color,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
      }} />
    </div>
  );
};

export default Reticle; 