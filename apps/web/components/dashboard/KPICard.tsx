import React from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon?: React.ComponentType<any>;
    trend?: string;
    trendType?: 'up' | 'down' | 'neutral';
    color?: string;
}

export function KPICard({ title, value, icon: Icon, trend, trendType = 'neutral', color = 'indigo' }: KPICardProps) {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-700',
        green: 'bg-green-50 text-green-700',
        blue: 'bg-blue-50 text-blue-700',
        orange: 'bg-orange-50 text-orange-700',
        red: 'bg-red-50 text-red-700',
    };

    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-bold mt-1 text-gray-900">{value}</h3>
                </div>
                {Icon && (
                    <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                )}
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${trendType === 'up' ? 'text-green-600' :
                            trendType === 'down' ? 'text-red-600' : 'text-gray-500'
                        }`}>
                        {trend}
                    </span>
                    <span className="text-gray-400 ml-2">vs last month</span>
                </div>
            )}
        </div>
    );
}
