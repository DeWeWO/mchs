import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import writeXlsxFile from 'write-excel-file/browser';
import {
    AlertTriangle,
    CheckCircle2,
    Filter as FilterIcon,
    Loader2,
    MapPin,
    Clock,
    Shield,
    RefreshCw,
    PlayCircle,
    XCircle,
    Download
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_URL, SOCKET_URL } from '../config/env';

const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'NEW', label: 'New' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'FALSE_ALARM', label: 'False alarm' }
];

const statusClass = {
    NEW: 'bg-red-500/15 text-red-400 border-red-500/30',
    IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    RESOLVED: 'bg-green-500/15 text-green-400 border-green-500/30',
    FALSE_ALARM: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
};

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

const getIncidentStatus = (incident) => incident.status || (incident.resolved ? 'RESOLVED' : 'NEW');

export default function IncidentsPage() {
    const { addToast } = useToast();
    const [incidents, setIncidents] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [orgFilter, setOrgFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeIncident, setActiveIncident] = useState(null);

    const upsertIncident = (incident) => {
        setIncidents((prev) => {
            if (!incident?.id) return prev;
            const index = prev.findIndex((item) => item.id === incident.id);
            if (index === -1) return [incident, ...prev];
            const next = [...prev];
            next[index] = incident;
            return next;
        });
        setActiveIncident((current) => (current?.id === incident?.id ? incident : current));
    };

    const loadIncidents = async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('limit', '500');
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);

            const [incRes, orgRes] = await Promise.all([
                fetch(`${API_URL}/incidents?${params.toString()}`, { headers: getAuthHeader() }),
                fetch(`${API_URL}/organizations`, { headers: getAuthHeader() })
            ]);
            if (!incRes.ok) throw new Error('Failed to load incidents');
            const incidentData = await incRes.json();
            const orgData = orgRes.ok ? await orgRes.json() : [];
            setIncidents(Array.isArray(incidentData) ? incidentData : []);
            setOrganizations(Array.isArray(orgData) ? orgData : []);
        } catch (e) {
            addToast(e.message, 'error');
            setIncidents([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadIncidents();
        const interval = setInterval(() => loadIncidents(false), 20000);
        return () => clearInterval(interval);
    }, [statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('incident-created', upsertIncident);
        socket.on('incident-updated', upsertIncident);
        return () => socket.disconnect();
    }, []);

    const updateStatus = async (incidentId, status) => {
        try {
            const res = await fetch(`${API_URL}/incidents/${incidentId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ status })
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || 'Failed to update incident status');
            upsertIncident(payload);
            addToast('Incident status updated', 'success');
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    const filteredIncidents = useMemo(() => {
        return incidents.filter((incident) => {
            const currentStatus = getIncidentStatus(incident);
            const byStatus = statusFilter === 'all' || currentStatus === statusFilter;
            const byOrg = orgFilter === 'all' || incident.organizationId === orgFilter;
            const haystack = `${incident.type || ''} ${incident.description || ''}`.toLowerCase();
            const bySearch = haystack.includes(search.toLowerCase());
            return byStatus && byOrg && bySearch;
        });
    }, [incidents, statusFilter, orgFilter, search]);

    const selected = activeIncident || filteredIncidents[0];

    const exportRows = filteredIncidents.map((incident) => ({
        date: new Date(incident.createdAt).toLocaleString(),
        type: incident.type,
        description: incident.description,
        organization: incident.organization?.name || '',
        device: incident.device?.name || '',
        status: getIncidentStatus(incident),
        resolvedBy: incident.resolvedBy || '',
        resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : ''
    }));

    const exportPdf = () => {
        const doc = new jsPDF();
        doc.text('Incidents report', 14, 16);
        autoTable(doc, {
            startY: 24,
            head: [['Date', 'Type', 'Description', 'Organization', 'Device', 'Status', 'Resolved by', 'Resolved at']],
            body: exportRows.map((row) => [row.date, row.type, row.description, row.organization, row.device, row.status, row.resolvedBy, row.resolvedAt]),
            styles: { fontSize: 7 }
        });
        doc.save('incidents-report.pdf');
    };

    const exportExcel = async () => {
        await writeXlsxFile([
            [
                { value: 'Date', fontWeight: 'bold' },
                { value: 'Type', fontWeight: 'bold' },
                { value: 'Description', fontWeight: 'bold' },
                { value: 'Organization', fontWeight: 'bold' },
                { value: 'Device', fontWeight: 'bold' },
                { value: 'Status', fontWeight: 'bold' },
                { value: 'Resolved by', fontWeight: 'bold' },
                { value: 'Resolved at', fontWeight: 'bold' }
            ],
            ...exportRows.map((row) => [
                { value: row.date },
                { value: row.type || '' },
                { value: row.description || '' },
                { value: row.organization || '' },
                { value: row.device || '' },
                { value: row.status || '' },
                { value: row.resolvedBy || '' },
                { value: row.resolvedAt || '' }
            ])
        ], { fileName: 'incidents-report.xlsx' });
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-main">Incidents</h1>
                    <p className="text-text-muted">IoT alerts, operator actions and processing statuses</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={exportPdf} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-sm text-text-main">
                        <Download size={16} /> Export PDF
                    </button>
                    <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-sm text-text-main">
                        <Download size={16} /> Export Excel
                    </button>
                    <button onClick={() => loadIncidents()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-sm text-text-main">
                        <RefreshCw size={16} className="text-brand-blue" /> Refresh
                    </button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-text-muted text-sm font-semibold uppercase">
                    <FilterIcon size={16} /> Filters
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main">
                    {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main">
                    <option value="all">All organizations</option>
                    {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-main" />
                <div className="text-xs text-text-muted ml-auto">Found: <span className="font-semibold text-text-main">{filteredIncidents.length}</span></div>
            </div>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-hidden">
                <div className="glass-panel rounded-2xl border border-border p-4 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-text-muted uppercase tracking-wide">List</div>
                        {isLoading && <Loader2 size={16} className="text-brand-blue animate-spin" />}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                        {filteredIncidents.length === 0 && <div className="text-center text-text-muted text-sm py-8">No incidents found</div>}
                        {filteredIncidents.map((incident) => {
                            const currentStatus = getIncidentStatus(incident);
                            return (
                                <button
                                    key={incident.id}
                                    onClick={() => setActiveIncident(incident)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${incident.id === selected?.id ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-surface border-border hover:border-brand-blue/30'}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
                                            <AlertTriangle size={16} className={currentStatus === 'RESOLVED' ? 'text-brand-green' : 'text-brand-red'} />
                                            <span className="truncate">{incident.type}</span>
                                        </div>
                                        <StatusBadge status={currentStatus} />
                                    </div>
                                    <p className="text-sm text-text-main mt-1 line-clamp-2">{incident.description}</p>
                                    <div className="text-xs text-text-muted mt-2 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2"><Shield size={12} /> {incident.organization?.name || 'No organization'}</span>
                                        <span>{new Date(incident.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-panel rounded-2xl border border-border p-6 xl:col-span-2 flex flex-col overflow-y-auto custom-scrollbar">
                    {!selected ? (
                        <div className="text-center text-text-muted py-10">Select an incident</div>
                    ) : (
                        <IncidentDetails selected={selected} updateStatus={updateStatus} />
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    return <span className={`shrink-0 px-2 py-1 rounded-lg border text-[10px] font-bold ${statusClass[status] || statusClass.NEW}`}>{status}</span>;
}

function IncidentDetails({ selected, updateStatus }) {
    const currentStatus = getIncidentStatus(selected);
    const isClosed = currentStatus === 'RESOLVED' || currentStatus === 'FALSE_ALARM';

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-text-muted font-semibold">
                        <StatusBadge status={currentStatus} />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mt-2">{selected.type}</h2>
                </div>
                {!isClosed && (
                    <div className="flex flex-wrap gap-2">
                        {currentStatus === 'NEW' && (
                            <button onClick={() => updateStatus(selected.id, 'IN_PROGRESS')} className="px-4 py-2 rounded-lg bg-brand-blue text-white font-semibold hover:bg-blue-600 transition-all flex items-center gap-2">
                                <PlayCircle size={16} /> In progress
                            </button>
                        )}
                        <button onClick={() => updateStatus(selected.id, 'RESOLVED')} className="px-4 py-2 rounded-lg bg-brand-green text-white font-semibold hover:bg-green-600 transition-all flex items-center gap-2">
                            <CheckCircle2 size={16} /> Resolve
                        </button>
                        <button onClick={() => updateStatus(selected.id, 'FALSE_ALARM')} className="px-4 py-2 rounded-lg bg-slate-600 text-white font-semibold hover:bg-slate-500 transition-all flex items-center gap-2">
                            <XCircle size={16} /> False alarm
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <InfoBlock icon={MapPin} label="Location">{selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}</InfoBlock>
                <InfoBlock icon={Shield} label="Organization">{selected.organization?.name || 'Not assigned'}</InfoBlock>
                <InfoBlock icon={Clock} label="Created">{new Date(selected.createdAt).toLocaleString()}</InfoBlock>
                <InfoBlock icon={CheckCircle2} label="Resolved">{selected.resolvedAt ? new Date(selected.resolvedAt).toLocaleString() : '-'}</InfoBlock>
            </div>

            <div className="mt-6">
                <div className="text-xs font-semibold text-text-muted uppercase mb-2">Description</div>
                <p className="text-sm text-text-main bg-surface border border-border rounded-xl p-4">{selected.description}</p>
            </div>

            {selected.metadata && (
                <div className="mt-6">
                    <div className="text-xs font-semibold text-text-muted uppercase mb-2">Telemetry</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(selected.metadata).map(([key, value]) => (
                            <div key={key} className="bg-surface border border-border rounded-xl p-3">
                                <div className="text-[10px] uppercase text-text-muted">{key}</div>
                                <div className="text-lg font-bold text-text-main">{String(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

function InfoBlock({ icon: Icon, label, children }) {
    return (
        <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
            <Icon size={18} className="text-brand-blue mt-0.5" />
            <div>
                <div className="text-xs uppercase text-text-muted font-semibold">{label}</div>
                <div className="text-sm text-text-main">{children}</div>
            </div>
        </div>
    );
}
