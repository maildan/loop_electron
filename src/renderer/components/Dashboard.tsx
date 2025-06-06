import React, { useState, useEffect } from 'react';
import { useDatabase, useSystem, useNative, TypingLogEntry, TypingStatsEntry, PerformanceMetrics } from '../hooks/useElectron';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalSessions: number;
  averageWpm: number;
  averageAccuracy: number;
  bestWpm: number;
  bestAccuracy: number;
  totalTime: number;
  recentSessions: TypingLogEntry[];
  weeklyStats: TypingStatsEntry[];
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const database = useDatabase();
  const system = useSystem();
  const native = useNative();

  useEffect(() => {
    loadDashboardData();
    startPerformanceMonitoring();

    return () => {
      stopPerformanceMonitoring();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 타이핑 로그 로드
      const recentSessions = await database.getTypingLogs(10);
      
      // 타이핑 통계 로드
      const weeklyStats = await database.getTypingStats();

      // 집계 통계 계산
      const totalSessions = recentSessions.length;
      const averageWpm = totalSessions > 0 
        ? recentSessions.reduce((sum, session) => sum + session.wpm, 0) / totalSessions 
        : 0;
      const averageAccuracy = totalSessions > 0 
        ? recentSessions.reduce((sum, session) => sum + session.accuracy, 0) / totalSessions 
        : 0;
      const bestWpm = totalSessions > 0 
        ? Math.max(...recentSessions.map(session => session.wpm)) 
        : 0;
      const bestAccuracy = totalSessions > 0 
        ? Math.max(...recentSessions.map(session => session.accuracy)) 
        : 0;
      const totalTime = weeklyStats.reduce((sum, stat) => sum + stat.totalTime, 0);

      setStats({
        totalSessions,
        averageWpm,
        averageAccuracy,
        bestWpm,
        bestAccuracy,
        totalTime,
        recentSessions,
        weeklyStats,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '대시보드 데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const startPerformanceMonitoring = async () => {
    try {
      await native.startPerformanceMonitoring(5000); // 5초 간격
      
      const updateMetrics = async () => {
        try {
          const metrics = await native.getPerformanceMetrics();
          setPerformanceMetrics(metrics);
        } catch (err) {
          console.warn('성능 지표 가져오기 실패:', err);
        }
      };

      // 5초마다 지표 업데이트
      const interval = setInterval(updateMetrics, 5000);
      updateMetrics(); // 초기 업데이트

      return () => clearInterval(interval);
    } catch (err) {
      console.warn('성능 모니터링 시작 실패:', err);
    }
  };

  const stopPerformanceMonitoring = async () => {
    try {
      await native.stopPerformanceMonitoring();
    } catch (err) {
      console.warn('성능 모니터링 중지 실패:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">대시보드 로드 오류</div>
          <div className="text-gray-600 dark:text-gray-400 mb-4">{error}</div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Chart data
  const wpmChartData = {
    labels: stats.recentSessions.map((_, index) => `Session ${index + 1}`),
    datasets: [
      {
        label: 'WPM',
        data: stats.recentSessions.map(session => session.wpm),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const accuracyChartData = {
    labels: stats.recentSessions.map((_, index) => `Session ${index + 1}`),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: stats.recentSessions.map(session => session.accuracy),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const performanceChartData = performanceMetrics ? {
    labels: ['CPU', 'Memory', 'GPU'],
    datasets: [
      {
        data: [
          performanceMetrics.cpuUsage,
          performanceMetrics.memoryUsage,
          performanceMetrics.gpuUsage,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="dashboard p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            타이핑 대시보드
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            타이핑 진행률과 성능 지표를 추적하세요
          </p>
        </div>

        {/* 통계 개요 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  평균 WPM
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(stats.averageWpm)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  평균 정확도
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(stats.averageAccuracy)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  최고 WPM
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(stats.bestWpm)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  총 세션 수
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.totalSessions}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* WPM 진행률 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              WPM 진행률
            </h3>
            <Line data={wpmChartData} options={chartOptions} />
          </div>

          {/* 정확도 차트 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              정확도 진행률
            </h3>
            <Bar data={accuracyChartData} options={chartOptions} />
          </div>
        </div>

        {/* 성능 지표 */}
        {performanceMetrics && performanceChartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                시스템 성능
              </h3>
              <div className="w-64 mx-auto">
                <Doughnut 
                  data={performanceChartData} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                성능 상세 정보
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">CPU 사용률</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(performanceMetrics.cpuUsage)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">메모리 사용률</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(performanceMetrics.memoryUsage)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">GPU 사용률</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(performanceMetrics.gpuUsage)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">온도</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(performanceMetrics.temperature)}°C
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 최근 세션 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            최근 세션
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    WPM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    정확도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    오류 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    텍스트 길이
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {stats.recentSessions.map((session, index) => (
                  <tr key={session.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(session.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      {Math.round(session.wpm)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      {Math.round(session.accuracy)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                      {session.errors}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {session.text.length} 글자
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
