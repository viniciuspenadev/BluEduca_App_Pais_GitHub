import { type FC } from 'react';
import { User, GraduationCap } from 'lucide-react';

interface StudentHeaderProps {
    student: {
        name: string;
        id: string; // Used as RA for now or fetch specific column
        currentEnrollment?: {
            status: string;
            academic_year: string;
        };
    };
}

export const StudentHeader: FC<StudentHeaderProps> = ({ student }) => {
    return (
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

            <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                    <User className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">{student.name}</h1>
                    <div className="flex items-center gap-2 text-brand-100 text-sm mt-1">
                        <GraduationCap className="w-4 h-4" />
                        <span>Matrícula: {student.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    {student.currentEnrollment && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/20">
                            {student.currentEnrollment.status === 'approved' ? 'Matriculado' : 'Pendente'} • {student.currentEnrollment.academic_year}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
