import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { useTheme } from '../../hooks/useTheme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const IncidentTrendChart = ({ data = [] }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const accent = isDark ? '#00f5ff' : '#2563eb';
  const grid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const text = isDark ? '#94a3b8' : '#64748b';
  const bg = isDark ? '#111827' : '#fff';

  const labelSet = [...new Set(data.map(d => {
    const dt = new Date(d.month || d.date);
    return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }))];

  const totals = {};
  data.forEach(d => {
    const dt = new Date(d.month || d.date);
    const key = `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
    totals[key] = (totals[key] || 0) + parseInt(d.count || 0);
  });

  const chartData = {
    labels: labelSet,
    datasets: [{
      label: 'Incidents',
      data: labelSet.map(l => totals[l] || 0),
      borderColor: accent,
      backgroundColor: `${accent}22`,
      fill: true, tension: 0.4,
      pointBackgroundColor: accent, pointRadius: 5, pointHoverRadius: 8, borderWidth: 2,
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: bg, titleColor: isDark ? '#f1f5f9' : '#0f172a', bodyColor: text, borderColor: accent, borderWidth: 1 },
    },
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, font: { family: 'Inter' } } },
      y: { grid: { color: grid }, ticks: { color: text, font: { family: 'Inter' } }, beginAtZero: true },
    },
  };

  if (!data.length) return <div className="no-data" style={{ padding: 40 }}><span className="material-icons">show_chart</span><p>No trend data yet</p></div>;

  return <div style={{ height: 260 }}><Line data={chartData} options={options} /></div>;
};

export default IncidentTrendChart;
