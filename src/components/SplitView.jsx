import { useState, useRef } from 'react';

export default function SplitView({ children }) {
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

    // 限制最小和最大比例
    if (newRatio >= 20 && newRatio <= 80) {
      setSplitRatio(newRatio);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 只渲染一个终端时不显示分割线
  if (!children || children.length < 2) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 左侧面板 */}
      <div
        style={{ width: `${splitRatio}%` }}
        className="h-full overflow-hidden"
      >
        {children[0]}
      </div>

      {/* 分割线 */}
      <div
        className="split-view-divider w-1 h-full cursor-col-resize flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* 右侧面板 */}
      <div
        style={{ width: `${100 - splitRatio}%` }}
        className="h-full overflow-hidden"
      >
        {children[1]}
      </div>
    </div>
  );
}
