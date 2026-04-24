import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Activity, Clock, Flame, Award, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { SpeakingSession } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SpeakingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchSessions() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('toefl_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true }); // Get ascending to compute trend charts
        
        if (error) {
          console.error("Error fetching sessions:", error);
          return;
        }

        if (active && data) {
          const formattedData: SpeakingSession[] = data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            date: row.date,
            task_type: row.task_type,
            durationMinutes: row.duration_minutes,
            overallScore: row.overall_score,
            metrics: {
              delivery: row.delivery_score,
              language_use: row.language_use_score,
              topic_development: row.topic_development_score
            },
            feedback: row.feedback,
            transcript: row.transcript
          }));
          setSessions(formattedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchSessions();

    return () => { active = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex justify-center items-center">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  // Handle case with no data yet
  if (sessions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('dash_title')}</h1>
          <p className="text-slate-500 mt-2">{t('dash_desc')}</p>
        </div>
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <Activity size={48} className="text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Practice Sessions Yet</h2>
          <p className="text-slate-500 max-w-md">Once you start practicing with your Voxpeb device, your TOEFL speaking scores will appear here.</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalMinutes = Math.round(sessions.reduce((acc, curr) => acc + curr.durationMinutes, 0));
  const avgScore = Math.round(sessions.reduce((acc, curr) => acc + curr.overallScore, 0) / sessions.length);
  const currentStreak = 1; // Example static streak, normally computed based on dates

  // Prepare data for charts
  const trendData = sessions.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.overallScore
  }));

  const latestSession = sessions[sessions.length - 1];
  const radarData = [
    { subject: t('dash_delivery'), A: latestSession.metrics.delivery, fullMark: 4 },
    { subject: t('dash_language'), A: latestSession.metrics.language_use, fullMark: 4 },
    { subject: t('dash_topic'), A: latestSession.metrics.topic_development, fullMark: 4 },
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
            <p className="text-2xl font-bold text-slate-900">{avgScore} <span className="text-sm font-normal text-slate-400">/ 30</span></p>
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
                <YAxis domain={[0, 30]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
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
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} tick={false} axisLine={false} />
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
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {session.task_type === 'Independent' ? t('dash_task_independent') : t('dash_task_integrated')}
                    </span>
                    {session.durationMinutes} {t('dash_min')}
                  </p>
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
              
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
                <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">
                  <span className="font-semibold not-italic block mb-1 text-slate-800">{t('dash_transcript')}:</span> 
                  {session.transcript || '-'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700"><span className="font-semibold">{t('dash_feedback')}:</span> {session.feedback}</p>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_delivery')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.delivery} / 4</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(session.metrics.delivery / 4) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_language')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.language_use} / 4</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(session.metrics.language_use / 4) * 100}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{t('dash_topic')}</span>
                      <span className="font-medium text-slate-700">{session.metrics.topic_development} / 4</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(session.metrics.topic_development / 4) * 100}%` }}></div>
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
