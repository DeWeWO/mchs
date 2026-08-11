// src/components/widgets/RadiationChart.jsx
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: { display: false }, // Скрываем ось X
        y: {
            display: true,
            border: { display: false },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
        },
    },
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    elements: {
        point: { radius: 0, hoverRadius: 6 }, // Точки видны только при наведении
        line: { tension: 0.4, borderWidth: 2 }, // Плавная линия
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
};

export default function RadiationChart({ dataPoints }) {
    // Настройка градиента (в React chartjs-2 это делается через функцию или canvas, тут упростим для скорости)
    const data = {
        labels: ['-4ч', '-3ч', '-2ч', '-1ч', 'Сейчас'],
        datasets: [
            {
                fill: true,
                label: 'Радиация (мкЗв/ч)',
                data: dataPoints, // Данные приходят из пропсов
                borderColor: '#ffc107', // Желтый (как в оригинале)
                backgroundColor: 'rgba(255, 193, 7, 0.15)',
            },
        ],
    };

    return <div className="h-[160px] w-full"><Line options={options} data={data} /></div>;
}