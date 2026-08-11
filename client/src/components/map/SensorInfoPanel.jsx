import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Navigation, Phone, MapPin, Activity, Loader2 } from 'lucide-react';
import RadiationChart from '../widgets/RadiationChart';
import { API_URL } from '../../config/env';

const ranges = [
    { value: '1h', label: '1h' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' }
];

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

const valuesFor = (readings, key) => {
    const values = readings
        .map((reading) => Number(reading[key]))
        .filter((value) => Number.isFinite(value));
    return values.length ? values.slice(-24) : [0];
};

export default function SensorInfoPanel({ sensor, onClose, onBuildRoute }) {
    const [range, setRange] = useState('1h');
    const [readings, setReadings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!sensor?.id) return;
        const controller = new AbortController();

        const loadReadings = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/devices/${sensor.id}/readings?range=${range}`, {
                    headers: getAuthHeader(),
                    signal: controller.signal
                });
                if (!response.ok) {
                    setReadings([]);
                    return;
                }
                const data = await response.json();
                if (!controller.signal.aborted) setReadings(Array.isArray(data) ? data : []);
            } catch (error) {
                if (error.name !== 'AbortError') console.error('Readings loading error:', error);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        void loadReadings();
        return () => controller.abort();
    }, [sensor?.id, range]);

    const charts = useMemo(() => ([
        { key: 'gasLevel', label: 'Gas', data: valuesFor(readings, 'gasLevel') },
        { key: 'methaneLevel', label: 'Methane', data: valuesFor(readings, 'methaneLevel') },
        { key: 'quakeMagnitude', label: 'Quake', data: valuesFor(readings, 'quakeMagnitude') },
        { key: 'batteryLevel', label: 'Battery', data: valuesFor(readings, 'batteryLevel') },
        { key: 'temperature', label: 'Temperature', data: valuesFor(readings, 'temperature') }
    ]), [readings]);

    if (!sensor) return null;

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 h-full w-96 glass-panel border-l border-white/10 z-20 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
        >
            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-900/40">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(sensor.status)} animate-pulse`} />
                        <span className="text-xs uppercase tracking-wider text-slate-400">ID: {sensor.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight">{sensor.title}</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-slate-400 hover:text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-xs text-slate-500 block">Status</span>
                        <span className={`font-bold ${getTextColor(sensor.status)}`}>{getStatusLabel(sensor.status)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-xs text-slate-500 block">Current</span>
                        <span className="font-bold text-white">{sensor.value}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm text-slate-300">
                        <MapPin size={16} className="mt-0.5 text-brand-blue shrink-0" />
                        <span>Coords: {sensor.lat}, {sensor.lng}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <Phone size={16} className="text-brand-blue shrink-0" />
                        <span>+998 90 123-45-67</span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-2"><Activity size={14} /> History</h4>
                        <div className="flex rounded-lg overflow-hidden border border-white/10">
                            {ranges.map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setRange(item.value)}
                                    className={`px-2 py-1 text-xs ${range === item.value ? 'bg-brand-blue text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="h-32 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={20} /></div>
                    ) : readings.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-sm text-slate-500 bg-slate-900/50 rounded-xl border border-white/5">No readings yet</div>
                    ) : (
                        <div className="space-y-3">
                            {charts.map((chart) => (
                                <div key={chart.key} className="bg-slate-900/50 rounded-xl border border-white/5 p-2">
                                    <div className="text-xs text-slate-400 mb-1">{chart.label}</div>
                                    <div className="h-28"><RadiationChart dataPoints={chart.data} /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-slate-900/40">
                <button
                    onClick={() => onBuildRoute(sensor)}
                    className="w-full flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-all shadow-[0_0_15px_rgba(0,170,255,0.3)] hover:shadow-[0_0_25px_rgba(0,170,255,0.5)] active:scale-95"
                >
                    <Navigation size={18} /> Build route
                </button>
            </div>
        </motion.div>
    );
}

function getStatusColor(status) {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'DANGER') return 'bg-brand-red';
    if (normalized === 'WARNING') return 'bg-brand-yellow';
    if (normalized === 'ONLINE' || normalized === 'GOOD') return 'bg-brand-green';
    return 'bg-slate-500';
}

function getTextColor(status) {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'DANGER') return 'text-brand-red';
    if (normalized === 'WARNING') return 'text-brand-yellow';
    if (normalized === 'ONLINE' || normalized === 'GOOD') return 'text-brand-green';
    return 'text-slate-500';
}

function getStatusLabel(status) {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'DANGER') return 'ALARM';
    if (normalized === 'WARNING') return 'Warning';
    if (normalized === 'ONLINE' || normalized === 'GOOD') return 'Normal';
    if (normalized === 'OFFLINE') return 'Offline';
    return 'Unknown';
}
