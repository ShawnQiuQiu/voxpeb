import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, Legend
} from 'recharts';
import { Activity, Clock, Flame, Award, ChevronRight, Calendar } from 'lucide-react';
import { SpeakingSession } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Mock data for the dashboard
const mockSessions: SpeakingSession[] = [
  {
    id: '1',
    date: '2026-03-20',
    durationMinutes: 15,
    overallScore: 78,
    metrics: { pronunciation: 75, fluency: 80, vocabulary: 72, grammar: 85 },
    feedback: 'Good effort! Try to focus on the "th" sound and use more varied vocabulary.'
  },
  {
    id: '2',
    date: '2026-03-22',
    durationMinutes: 20,
    overallScore: 82,
    metrics: { pronunciation: 80, fluency: 85, vocabulary: 75, grammar: 88 },
    feedback: 'Excellent fluency today. Your grammar is very solid.'
  },
  {
    id: '3',
    date: '2026-03-24',
    durationMinutes: 12,
    overallScore: 80,
    metrics: { pronunciation: 78, fluency: 82, vocabulary: 76, grammar: 84 },
    feedback: 'Slight hesitation in some sentences, but overall very clear.'
  },
  {
    id: '4',
    date: '2026-03-26',
    durationMinutes: 30,
    overallScore: 85,
    metrics: { pronunciation: 82, fluency: 88, vocabulary: 80, grammar: 90 },
    feedback: 'Great improvement in vocabulary usage. Keep it up!'
  },
  {
    id: '5',
    date: '2026-03-28',
    durationMinutes: 25,
    overallScore: 88,
    metrics: { pronunciation: 85, fluency: 90, vocabulary: 85, grammar: 92 },
    feedback: 'Outstanding performance. Very natural phrasing.'
  },
  {
    id: '6',
    date: '2026-03-30',
    durationMinutes: 18,
    overallScore: 86,
    metrics: { pronunciation: 84, fluency: 86, vocabulary: 88, grammar: 86 },
    feedback: 'Consistent and clear. Try incorporating more idioms.'
  },
  {
    id: '7',
    date: '2026-04-02',
    durationMinutes: 22,
    overallScore: 90,
    metrics: { pronunciation: 88, fluency: 92, vocabulary: 88, grammar: 92 },
    feedback: 'Near native fluency in today\'s session. Fantastic work!'
  }
];

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [sessions] = useState<SpeakingSession[]>(mockSessions);

  // Calculate summary stats
  const totalMinutes = sessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const avgScore = Math.round(sessions.reduce((acc, curr) => acc + curr.overallScore, 0) / sessions.length);
  const currentStreak = 5; // Mock streak

  // Prepare data for charts
  const trendData = sessions.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.overallScore
  }));

  const latestMetrics = sessions[sessions.length - 1].metrics;
  const radarData = [
    { subject: t('dash_pronunciation'), A: latestMetrics.pronunciation, fullMark: 100 },
    { subject: t('dash_fluency'), A: latestMetrics.fluency, fullMark: 100 },
    { subject: t('dash_vocabulary'), A: latestMetrics.vocabulary, fullMark: 100 },
    { subject: t('dash_grammar'), A: latestMetrics.grammar, fullMark: 100 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('dash_title')}</h1>
        <p className="text-slate-500 mt-2">{t('dash_desc')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_avg_score')}</p>
            <p className="text-2xl font-bold text-slate-900">{avgScore}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_total_time')}</p>
            <p className="text-2xl font-bold text-slate-900">{totalMinutes} <span className="text-base font-normal text-slate-500">{t('dash_min')}</span></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_streak')}</p>
            <p className="text-2xl font-bold text-slate-900">{currentStreak} <span className="text-base font-normal text-slate-500">{t('dash_days')}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Trend Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-emerald-500" />
            {t('dash_trend')}
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t('dash_latest')}</h2>
          <p className="text-sm text-slate-500 mb-4">{t('dash_latest_desc')}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            {t('dash_recent')}
          </h2>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">{t('dash_view_all')}</button>
        </div>
        <div className="divide-y divide-slate-100">
          {[...sessions].reverse().map((session) => (
            <div key={session.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="font-semibold text-slate-900">{new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm text-slate-500">{session.durationMinutes} {t('dash_min')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('dash_overall')}</p>
                    <p className="text-xl font-bold text-emerald-600">{session.overallScore}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700"><span className="font-semibold">{t('dash_feedback')}:</span> {session.feedback}</p>
                
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_pronunciation')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.pronunciation}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${session.metrics.pronunciation}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_fluency')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.fluency}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${session.metrics.fluency}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_vocabulary')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.vocabulary}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${session.metrics.vocabulary}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_grammar')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.grammar}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${session.metrics.grammar}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
