import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Filter as FilterIcon, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import writeXlsxFile from 'write-excel-file/browser';
import { useToast } from '../context/ToastContext';
import { API_URL, DEVICE_STATUSES, DEVICE_TYPES } from '../config/env';

const getAuthHeader = () => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('mchs_user'));
        return storedUser?.token ? { Authorization: `Bearer ${storedUser.token}` } : {};
    } catch {
        return {};
    }
};

const formatSensorType = (type) => {
    if (!type) return 'MULTI';
    return String(type).toUpperCase();
};

const humanStatus = (status) => {
    if (status === DEVICE_STATUSES.DANGER) return 'ТРЕВОГА';
    if (status === DEVICE_STATUSES.WARNING) return 'Внимание';
    if (status === DEVICE_STATUSES.ONLINE) return 'Норма';
    if (status === DEVICE_STATUSES.OFFLINE) return 'Нет связи';
    return status || 'Неизвестно';
};

export default function ReportsPage() {
    const { addToast } = useToast();
    const [sensors, setSensors] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterOrg, setFilterOrg] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/devices`, {
                    headers: getAuthHeader()
                });
                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401) {
                        addToast('Авторизуйтесь заново', 'error');
                    }
                    throw new Error('Ошибка загрузки данных');
                }

                const safeData = Array.isArray(data) ? data : [];
                setSensors(safeData);
                setFilteredData(safeData);
            } catch (error) {
                console.error(error);
                setSensors([]);
                setFilteredData([]);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchData();
    }, [addToast]);

    useEffect(() => {
        let result = sensors;

        if (filterType !== 'all') {
            result = result.filter((sensor) => (sensor.type || DEVICE_TYPES.MULTI) === filterType);
        }

        if (filterStatus !== 'all') {
            result = result.filter((sensor) => sensor.status === filterStatus);
        }

        if (filterOrg !== 'all') {
            result = result.filter((sensor) => {
                const orgId = sensor.organization?.id || sensor.organizationId;
                return orgId === filterOrg;
            });
        }

        setFilteredData(result);
    }, [filterType, filterStatus, filterOrg, sensors]);

    const organizationOptions = useMemo(() => {
        const seen = new Map();

        sensors.forEach((sensor) => {
            if (sensor.organization) {
                seen.set(sensor.organization.id, sensor.organization.name);
            }
        });

        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }, [sensors]);

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF();
            const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error('Ошибка загрузки шрифта');

            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64data = String(reader.result).split(',')[1];
                doc.addFileToVFS('Roboto.ttf', base64data);
                doc.addFont('Roboto.ttf', 'Roboto', 'normal');
                doc.setFont('Roboto');
                doc.setFontSize(18);
                doc.text('Отчет ситуационного центра МЧС', 14, 20);
                doc.setFontSize(10);
                doc.text(`Дата: ${new Date().toLocaleString('ru-RU')}`, 14, 28);

                autoTable(doc, {
                    startY: 40,
                    head: [['Название', 'Тип', 'Статус', 'Последний отклик']],
                    body: filteredData.map((sensor) => [
                        sensor.name,
                        formatSensorType(sensor.type),
                        humanStatus(sensor.status),
                        sensor.lastSeen ? new Date(sensor.lastSeen).toLocaleString('ru-RU') : 'Никогда'
                    ]),
                    theme: 'grid',
                    styles: { font: 'Roboto', fontStyle: 'normal' },
                    headStyles: { fillColor: [22, 160, 133], font: 'Roboto', fontStyle: 'normal' }
                });

                doc.save('MCHS_Report.pdf');
                addToast('Отчет успешно скачан', 'success');
                setIsGeneratingPdf(false);
            };

            reader.onerror = () => {
                setIsGeneratingPdf(false);
                addToast('Ошибка чтения шрифта', 'error');
            };

            reader.readAsDataURL(blob);
        } catch (error) {
            console.error(error);
            addToast(`Ошибка PDF: ${error.message}`, 'error');
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadXlsx = async () => {
        setIsGeneratingXlsx(true);
        try {
            const headerStyle = { fontWeight: 'bold', backgroundColor: '#E2E8F0' };
            const rows = [
                [
                    { value: 'Название', ...headerStyle },
                    { value: 'Организация', ...headerStyle },
                    { value: 'Тип', ...headerStyle },
                    { value: 'Статус', ...headerStyle },
                    { value: 'Последний отклик', ...headerStyle }
                ],
                ...filteredData.map((sensor) => ([
                    { value: sensor.name || '' },
                    { value: sensor.organization?.name || '-' },
                    { value: formatSensorType(sensor.type) },
                    { value: humanStatus(sensor.status) },
                    { value: sensor.lastSeen ? new Date(sensor.lastSeen).toLocaleString('ru-RU') : 'Никогда' }
                ]))
            ];

            await writeXlsxFile(rows, {
                fileName: `MCHS_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
            });
            addToast('XLSX отчет готов', 'success');
        } catch (error) {
            addToast(`Ошибка XLSX: ${error.message}`, 'error');
        } finally {
            setIsGeneratingXlsx(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 h-full flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-text-main tracking-tight">Отчеты и журналы</h1>
                    <p className="text-text-muted mt-1">Архив событий и состояние оборудования</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue hover:bg-blue-600 text-white font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        <span>PDF</span>
                    </button>
                    <button
                        onClick={handleDownloadXlsx}
                        disabled={isGeneratingXlsx}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGeneratingXlsx ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                        <span>XLSX</span>
                    </button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4 border border-border">
                <div className="flex items-center gap-2 text-text-muted">
                    <FilterIcon size={20} />
                    <span className="font-bold text-sm">Фильтры:</span>
                </div>

                <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-main outline-none focus:border-brand-blue">
                    <option value="all">Все типы</option>
                    <option value={DEVICE_TYPES.GAS}>Газ</option>
                    <option value={DEVICE_TYPES.SMOKE}>Пожар</option>
                    <option value={DEVICE_TYPES.RADIATION}>Радиация</option>
                    <option value={DEVICE_TYPES.WATER_CAMERA}>Вода (AI)</option>
                </select>

                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-main outline-none focus:border-brand-blue">
                    <option value="all">Все статусы</option>
                    <option value={DEVICE_STATUSES.DANGER}>Тревога</option>
                    <option value={DEVICE_STATUSES.WARNING}>Внимание</option>
                    <option value={DEVICE_STATUSES.ONLINE}>Норма</option>
                    <option value={DEVICE_STATUSES.OFFLINE}>Оффлайн</option>
                </select>

                <select value={filterOrg} onChange={(event) => setFilterOrg(event.target.value)} className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-main outline-none focus:border-brand-blue">
                    <option value="all">Все объекты</option>
                    {organizationOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                </select>

                <div className="ml-auto text-xs text-text-muted">
                    Найдено: <span className="font-bold text-text-main">{filteredData.length}</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-border glass-panel custom-scrollbar relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-app/50 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-brand-blue" size={32} />
                    </div>
                )}

                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface border-b border-border sticky top-0 backdrop-blur-md z-10">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-text-muted">Название</th>
                            <th className="p-4 text-sm font-semibold text-text-muted">Тип</th>
                            <th className="p-4 text-sm font-semibold text-text-muted">Организация</th>
                            <th className="p-4 text-sm font-semibold text-text-muted">Статус</th>
                            <th className="p-4 text-sm font-semibold text-text-muted">Последняя активность</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredData.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan="5" className="p-4 text-center text-text-muted">Нет данных</td>
                            </tr>
                        )}
                        {filteredData.map((sensor) => (
                            <tr key={sensor.id} className="hover:bg-surface-hover transition-colors">
                                <td className="p-4 text-text-main font-medium">{sensor.name}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-surface border border-border text-text-muted tracking-wider">
                                        {formatSensorType(sensor.type)}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-text-muted">{sensor.organization?.name || '-'}</td>
                                <td className="p-4"><StatusBadge status={sensor.status} /></td>
                                <td className="p-4 text-text-muted font-mono text-xs">
                                    {sensor.lastSeen ? new Date(sensor.lastSeen).toLocaleString() : 'Никогда'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = {
        [DEVICE_STATUSES.ONLINE]: 'bg-green-500/10 text-green-500 border-green-500/20',
        [DEVICE_STATUSES.WARNING]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        [DEVICE_STATUSES.DANGER]: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse',
        [DEVICE_STATUSES.OFFLINE]: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || styles[DEVICE_STATUSES.OFFLINE]} flex items-center gap-1 w-fit`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {humanStatus(status)}
        </span>
    );
}
