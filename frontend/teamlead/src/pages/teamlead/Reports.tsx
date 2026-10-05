import React from 'react';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { ChartCard } from '../../components/dashboard/ChartCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { BarChart3, TrendingUp, ShieldCheck, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export const Reports: React.FC = () => {
  const { tickets } = useTickets();
  const { users } = useAuth();

  // 1. Status breakdown
  const statusData = [
    { name: 'Open', count: tickets.filter((t) => t.status === 'Open').length },
    { name: 'Pending', count: tickets.filter((t) => t.status === 'Pending').length },
    { name: 'Resolved', count: tickets.filter((t) => t.status === 'Resolved').length },
    { name: 'Closed', count: tickets.filter((t) => t.status === 'Closed').length },
    { name: 'Escalated', count: tickets.filter((t) => t.status === 'Escalated').length },
  ];

  // 2. Priority breakdown
  const priorityData = [
    { name: 'Low', count: tickets.filter((t) => t.priority === 'Low').length, color: '#64748b' },
    { name: 'Medium', count: tickets.filter((t) => t.priority === 'Medium').length, color: '#0ea5e9' },
    { name: 'High', count: tickets.filter((t) => t.priority === 'High').length, color: '#f97316' },
    { name: 'Critical', count: tickets.filter((t) => t.priority === 'Critical').length, color: '#ef4444' },
  ];

  // 3. Employee Workload
  const agentWorkloadData = users.map((u) => {
    const userTickets = tickets.filter((t) => t.assignedAgent === u.name);
    return {
      name: u.name.split(' ')[0],
      Open: userTickets.filter((t) => t.status === 'Open').length,
      Pending: userTickets.filter((t) => t.status === 'Pending').length,
      Resolved: userTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
    };
  });

  // 4. Resolution Performance Trend (Weekly mock data)
  const resolutionTrendData = [
    { day: 'Mon', created: 14, resolved: 12 },
    { day: 'Tue', created: 18, resolved: 19 },
    { day: 'Wed', created: 22, resolved: 20 },
    { day: 'Thu', created: 15, resolved: 17 },
    { day: 'Fri', created: 25, resolved: 23 },
    { day: 'Sat', created: 8, resolved: 9 },
    { day: 'Sun', created: 6, resolved: 7 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">ITSM Executive Reports & Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Historical trend analysis, agent workload metrics, priority velocity, and SLA adherence.
        </p>
      </div>

      {/* Grid of 4 Recharts Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Tickets by Status */}
        <ChartCard title="Tickets by Status" subtitle="Active distribution across workflow states">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 2. Tickets by Priority */}
        <ChartCard title="Tickets by Severity / Priority" subtitle="Ticket count weighted by business urgency">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="count"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 3. Employee Workload Comparison */}
        <ChartCard title="Employee Workload Comparison" subtitle="Open vs Pending vs Resolved by Employee">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentWorkloadData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Open" fill="#0ea5e9" stackId="a" />
                <Bar dataKey="Pending" fill="#f59e0b" stackId="a" />
                <Bar dataKey="Resolved" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 4. Resolution Velocity Trend */}
        <ChartCard title="Weekly Resolution Velocity" subtitle="Created vs Resolved ticket throughput">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resolutionTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" stroke="#0ea5e9" fill="#e0f2fe" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#d1fae5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* 5. Employee Performance Summary Table */}
      <div className="space-y-3 w-full max-w-full min-w-0">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Team Member Performance Metrics</h3>
          <p className="text-xs text-slate-500">Summary performance data by active team technician</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full min-w-0">
          <div className="w-full max-w-full overflow-x-auto lg:overflow-x-visible">
            <table className="w-full text-left border-collapse table-fixed max-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-3 w-[25%]">Employee Name</th>
                  <th className="py-2 px-3 w-[15%]">Total Assigned</th>
                  <th className="py-2 px-3 w-[15%]">Open Tickets</th>
                  <th className="py-2 px-3 w-[15%]">Resolved Tickets</th>
                  <th className="py-2 px-3 w-[15%]">SLA Adherence</th>
                  <th className="py-2 px-3 w-[15%] text-right">Avg Resolve Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {users.map((u, idx) => {
                  const uTickets = tickets.filter((t) => t.assignedAgent === u.name);
                  const openCount = uTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress' || t.status === 'Pending').length;
                  const resolvedCount = uTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
                  const slaRate = idx === 0 ? '98.5%' : idx === 1 ? '96.2%' : idx === 2 ? '99.0%' : '94.8%';
                  const avgTime = idx === 0 ? '1.8 hrs' : idx === 1 ? '2.4 hrs' : idx === 2 ? '1.5 hrs' : '3.1 hrs';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 truncate min-w-0">
                        <div className="flex items-center space-x-2 truncate min-w-0">
                          <UserAvatar name={u.name} avatar={u.avatar} size="xs" />
                          <span className="font-semibold text-slate-900 truncate" title={u.name}>{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 truncate min-w-0">{uTickets.length}</td>
                      <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          {openCount}
                        </span>
                      </td>
                      <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          {resolvedCount}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-600 truncate min-w-0 whitespace-nowrap">{slaRate}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate-600 truncate min-w-0 whitespace-nowrap">{avgTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
