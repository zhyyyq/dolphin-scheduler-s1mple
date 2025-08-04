import React from "react";
import 'index.less';

const StatsItem: React.FC<{ title: string; value: number }> = ({ title, value }) => {
  return (
    <div className="stats-item">
      <div className="stats-item-title">{title}</div>
      <div className="stats-item-value">{value}</div>
    </div>
  );
}
export default StatsItem;