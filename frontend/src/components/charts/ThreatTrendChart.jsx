import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useTheme } from '../../hooks/useTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PALETTE = ['#00f5ff','#7c3aed','#10b981','#f59e0b','#ef4444','#3b82f6','#f97316','#ec4899','#06b6d4'];

const ThreatTrendChart = ({ data = [] }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const text = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (!data.length) return <div className="no-data" style={{ padding: 40 }}><span className="material-icons">bar_chart</span><p>No data available</p></div>;

  const chartData = {
    labels: data.map(d => (d.threat_type || d.label || '').replace(/_/g, ' ')),
    datasets: [{
      label: 'Count',
      data: data.map(d => parseInt(d.count)),
      backgroundColor: data.map((_, i) => `${PALETTE[i % PALETTE.length]}88`),
      borderColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2, borderRadius: 6,
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: isDark ? '#111827' : '#fff', titleColor: isDark ? '#f1f5f9' : '#0f172a', bodyColor: text, borderColor: isDark ? '#1f2937' : '#e2e8f0', borderWidth: 1 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: text, font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: grid }, ticks: { color: text, font: { family: 'Inter' } }, beginAtZero: true },
    },
  };

  return <div style={{ height: 260 }}><Bar data={chartData} options={options} /></div>;
};

export default ThreatTrendChart;
