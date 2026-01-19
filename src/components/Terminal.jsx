import { useEffect } from 'react';
import { useTerminal } from '../hooks/useTerminal';

export default function Terminal({ id, shell, cwd, isActive, onFocus }) {
  const { terminalRef, isReady, focus } = useTerminal(id, shell, cwd);

  useEffect(() => {
    if (isActive && isReady) {
      focus();
    }
  }, [isActive, isReady, focus]);

  return (
    <div
      className="h-full w-full bg-terminal-bg"
      onClick={onFocus}
    >
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
}
