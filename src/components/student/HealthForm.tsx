'use client';

import { useState } from 'react';
import {
    Save, Loader2, Heart, Moon, Utensils, Smile, Users, Activity, AlertCircle, CheckCircle2, FileWarning
} from 'lucide-react';
import { updateStudentHealth } from '@/app/actions/student-actions';

// Structured Types matching CompleteEnrollment.tsx
interface Allergy {
    allergy: string;
    severity: string;
    reaction: string;
}

interface MedicationAllowed {
    name: string;
    dosage: string;
    trigger: string;
}

interface MedicationRestricted {
    name: string;
    reason: string;
}

interface HealthFormProps {
    studentId: string;
    initialData: any;
    readOnly?: boolean;
}

export const HealthForm = ({ studentId, initialData, readOnly = false }: HealthFormProps) => {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(initialData);

    const handleSave = async () => {
        if (readOnly) return;
        setSaving(true);
        try {
            await updateStudentHealth(studentId, formData);
            alert('Ficha de saúde atualizada com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const updateHabit = (category: string, field: string, value: string) => {
        if (readOnly) return;
        setFormData((prev: any) => ({
            ...prev,
            habits: {
                ...prev.habits,
                [category]: {
                    ...prev.habits[category],
                    [field]: value
                }
            }
        }));
    };

    // Helper to safely get array (handles legacy string arrays or objects)
    const safeArray = (arr: any[]) => Array.isArray(arr) ? arr : [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" /> Ficha de Saúde e Hábitos
                </h3>
                {!readOnly && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-brand-700 disabled:opacity-50 shadow-sm"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Alterações
                    </button>
                )}
                {readOnly && (
                    <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        Visualização (Somente Leitura)
                    </span>
                )}
            </div>

            {/* Health Section */}
            <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 space-y-6 ${readOnly ? '' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Tipo Sanguíneo</label>
                        <select
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-3 focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
                            value={formData.blood_type}
                            onChange={e => setFormData({ ...formData, blood_type: e.target.value })}
                            disabled={readOnly}
                        >
                            <option value="">Selecione...</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Plano de Saúde</label>
                        <input
                            type="text"
                            placeholder="Ex: Unimed"
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-3 focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
                            value={formData.health_insurance}
                            onChange={e => setFormData({ ...formData, health_insurance: e.target.value })}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Número da Carteirinha</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-3 focus:ring-2 focus:ring-brand-500 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                            value={formData.health_insurance_number}
                            onChange={e => setFormData({ ...formData, health_insurance_number: e.target.value })}
                            disabled={readOnly}
                        />
                    </div>
                </div>

                {/* Structured Lists */}
                <div className="space-y-6 pt-2">
                    {/* Allergies */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" /> Alergias / Intolerâncias
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {safeArray(formData.allergies).length === 0 && <p className="text-sm text-slate-400 italic">Nenhuma alergia registrada.</p>}
                            {safeArray(formData.allergies).map((item: any, idx: number) => (
                                <div key={idx} className="bg-red-50 rounded-lg p-3 border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div>
                                        <span className="font-bold text-red-800 block md:inline md:mr-2">
                                            {typeof item === 'string' ? item : item.allergy}
                                        </span>
                                        {typeof item !== 'string' && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.severity === 'grave' ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-600'}`}>
                                                {item.severity || 'Leve'}
                                            </span>
                                        )}
                                    </div>
                                    {typeof item !== 'string' && item.reaction && (
                                        <span className="text-xs text-red-600 bg-white/50 px-2 py-1 rounded">
                                            Reação: {item.reaction}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Allowed Meds */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" /> Medicamentos Permitidos
                            </label>
                            <div className="space-y-2">
                                {safeArray(formData.medications_allowed).length === 0 && <p className="text-sm text-slate-400 italic">Nenhum registro.</p>}
                                {safeArray(formData.medications_allowed).map((item: any, idx: number) => (
                                    <div key={idx} className="bg-green-50 rounded-lg p-3 border border-green-100">
                                        <div className="font-bold text-green-800">
                                            {typeof item === 'string' ? item : item.name}
                                        </div>
                                        {typeof item !== 'string' && (
                                            <div className="text-xs text-green-600 mt-1 flex flex-wrap gap-2">
                                                {item.dosage && <span>Dose: {item.dosage}</span>}
                                                {item.trigger && <span className="bg-white/50 px-1 rounded">Quando: {item.trigger}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Restricted Meds */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                                <FileWarning className="w-4 h-4 text-red-600" /> Medicamentos Restritos
                            </label>
                            <div className="space-y-2">
                                {safeArray(formData.medications_restricted).length === 0 && <p className="text-sm text-slate-400 italic">Nenhum registro.</p>}
                                {safeArray(formData.medications_restricted).map((item: any, idx: number) => (
                                    <div key={idx} className="bg-red-50/50 rounded-lg p-3 border border-red-100">
                                        <div className="font-bold text-red-800">
                                            {typeof item === 'string' ? item : item.name}
                                        </div>
                                        {typeof item !== 'string' && item.reason && (
                                            <div className="text-xs text-red-600 mt-1">
                                                Motivo: {item.reason}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Observações Gerais</label>
                    <textarea
                        rows={2}
                        className="w-full bg-slate-50 border-0 rounded-lg text-sm p-3 focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
                        placeholder="Outras observações importantes..."
                        value={formData.health_observations || formData.medications} // Support new and old field
                        onChange={e => setFormData({ ...formData, health_observations: e.target.value })}
                        disabled={readOnly}
                    />
                </div>
            </div>

            {/* Habits Section */}
            <h4 className="text-md font-bold text-slate-700 mt-8 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-500" /> Hábitos e Rotina
            </h4>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${readOnly ? 'opacity-90 pointer-events-none' : ''}`}>
                {/* Sleep */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Moon className="w-4 h-4 text-purple-500" />
                        <h4 className="font-semibold text-slate-700">Sono</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Dorme às</label>
                            <input
                                type="time"
                                className="w-full bg-slate-50 border-0 rounded-lg text-sm p-2 disabled:bg-slate-100"
                                value={formData.habits.sleep.bedtime}
                                onChange={e => updateHabit('sleep', 'bedtime', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Acorda à noite?</label>
                            <select
                                className="w-full bg-slate-50 border-0 rounded-lg text-sm p-2 disabled:bg-slate-100"
                                value={formData.habits.sleep.wakes_up}
                                onChange={e => updateHabit('sleep', 'wakes_up', e.target.value)}
                                disabled={readOnly}
                            >
                                <option value="">...</option>
                                <option value="sim">Sim</option>
                                <option value="nao">Não</option>
                                <option value="as_vezes">Às vezes</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Food */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Utensils className="w-4 h-4 text-orange-500" />
                        <h4 className="font-semibold text-slate-700">Alimentação</h4>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Apetite</label>
                        <select
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-2 disabled:bg-slate-100"
                            value={formData.habits.food.appetite}
                            onChange={e => updateHabit('food', 'appetite', e.target.value)}
                            disabled={readOnly}
                        >
                            <option value="">Selecione...</option>
                            <option value="pouco">Pouco</option>
                            <option value="normal">Normal</option>
                            <option value="muito">Muito</option>
                            <option value="seletivo">Seletivo</option>
                        </select>
                    </div>
                    <div className="pt-2">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Restrições</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-2 disabled:bg-slate-100"
                            placeholder="Ex: Não come carne"
                            value={formData.habits.food.restrictions}
                            onChange={e => updateHabit('food', 'restrictions', e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                </div>

                {/* Hygiene */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Smile className="w-4 h-4 text-cyan-500" />
                        <h4 className="font-semibold text-slate-700">Higiene</h4>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Usa Fraldas?</label>
                        <select
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-2 disabled:bg-slate-100"
                            value={formData.habits.hygiene.diapers}
                            onChange={e => updateHabit('hygiene', 'diapers', e.target.value)}
                            disabled={readOnly}
                        >
                            <option value="">Selecione...</option>
                            <option value="sim">Sim (Sempre)</option>
                            <option value="nao">Não (Desfraldado)</option>
                            <option value="anoite">Apenas para dormir</option>
                            <option value="em_processo">Em processo de desfralde</option>
                        </select>
                    </div>
                </div>

                {/* Social */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                        <Users className="w-4 h-4 text-pink-500" />
                        <h4 className="font-semibold text-slate-700">Social</h4>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Comportamento</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border-0 rounded-lg text-sm p-2 disabled:bg-slate-100"
                            placeholder="Interage bem?"
                            value={formData.habits.social.behavior}
                            onChange={e => updateHabit('social', 'behavior', e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
