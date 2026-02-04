import { type FC, ReactNode } from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface InfoCardProps {
    title: string;
    value: string;
    subtext?: string;
    icon: LucideIcon;
    color: string; // e.g., 'text-green-600'
    bg: string; // e.g., 'bg-green-50'
    href: string;
    alert?: boolean;
}

export const InfoCard: FC<InfoCardProps> = ({ title, value, subtext, icon: Icon, color, bg, href, alert }) => {
    return (
        <Link href={href} className="group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-lg ${bg} ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {alert && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </div>
            <div>
                <h3 className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{title}</h3>
                <p className={`text-sm font-bold ${alert ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
                {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
            </div>

            <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
    );
}
