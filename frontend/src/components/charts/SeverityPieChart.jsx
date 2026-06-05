import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useTheme } from '../../hooks/useTheme';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };
const THREAT_COLORS = ['#00f5ff','#7c3aed','#10b981','#f59e0b','#ef4444','#3b82f6','#f97316','#ec4899'];

const SeverityPieChart = ({ data = [] }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const labels = data.map(d => d.severity || d.threat_type);
  const values = data.map(d => parseInt(d.count));
  const colors = data.map((d, i) => COLORS[d.severity] || THREAT_COLORS[i % THREAT_COLORS.length]);

  if (!data.length) return <div className="no-data" style={{ padding: 40 }}><span className="material-icons">pie_chart</span><p>No data available</p></div>;

  const chartData = {
    labels,
    datasets: [{
      data: values, backgroundColor: colors,
      borderWidth: 2, borderColor: isDark ? '#111827' : '#fff', hoverBorderWidth: 3,
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: isDark ? '#94a3b8' : '#475569', font: { family: 'Inter', size: 12 }, padding: 12, boxWidth: 12 },
      },
      tooltip: { backgroundColor: isDark ? '#111827' : '#fff', titleColor: isDark ? '#f1f5f9' : '#0f172a', bodyColor: isDark ? '#94a3b8' : '#475569', borderColor: isDark ? '#1f2937' : '#e2e8f0', borderWidth: 1 },
    },
    cutout: '62%',
  };

  return <div style={{ height: 260 }}><Doughnut data={chartData} options={options} /></div>;
};

export default SeverityPieChart;
