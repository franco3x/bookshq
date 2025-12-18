
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

export default function SimpleBarChart({ data, title, dataKey = "value", nameKey = "name", height = 300, onBarClick }) {
    if (!data || data.length === 0) return (
        <div className="flex items-center justify-center text-[var(--text-muted)] italic h-full">
            No data available
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col">
            {title && <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">{title}</h3>}
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey={nameKey}
                            type="category"
                            width={100}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            interval={0}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} onClick={onBarClick} cursor="pointer">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
