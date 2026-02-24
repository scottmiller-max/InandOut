import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
} from 'lucide-react-native';
import { supabase } from '../../services/supabase';

interface CalendarJob {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  from_address: string;
  to_address: string;
  move_date: string;
  move_time: string | null;
  status: string;
  num_movers: number;
  estimated_hours: number;
  team_lead_id: string | null;
  has_deposit: boolean;
}

interface AdminJobCalendarProps {
  onSelectJob: (job: CalendarJob) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS: Record<string, string> = {
  lead: '#94a3b8',
  quoted: '#a78bfa',
  scheduled: '#3b82f6',
  confirmed: '#2563eb',
  in_progress: '#f97316',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export default function AdminJobCalendar({ onSelectJob }: AdminJobCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getMonthDates = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const endPadding = 6 - lastDay.getDay();

    const dates: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      dates.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i));
    }

    for (let i = 0; i < endPadding; i++) {
      dates.push(null);
    }

    return dates;
  }, [currentDate]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
      const { data, error: fetchError } = await supabase.rpc('get_calendar_jobs', {
        start_date: startDate,
        end_date: endDate,
      });

      if (fetchError) throw fetchError;
      setJobs(data || []);
    } catch (err) {
      console.error('Failed to fetch calendar jobs:', err);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const getJobsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter((job) => job.move_date === dateStr);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isWithin48Hours = (dateStr: string) => {
    const jobDate = new Date(dateStr);
    const now = new Date();
    const diff = jobDate.getTime() - now.getTime();
    return diff > 0 && diff < 48 * 60 * 60 * 1000;
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const renderJobBadge = (job: CalendarJob) => {
    const statusColor = STATUS_COLORS[job.status] || '#64748b';
    const hasWarnings = !job.team_lead_id || !job.has_deposit;
    const isUpcoming = isWithin48Hours(job.move_date);

    return (
      <TouchableOpacity
        key={job.id}
        style={[styles.jobBadge, { backgroundColor: statusColor }]}
        onPress={() => onSelectJob(job)}
        activeOpacity={0.7}
      >
        <Text style={styles.jobBadgeText} numberOfLines={1}>
          {job.move_time ? job.move_time.slice(0, 5) : ''} {job.customer_name || 'Unknown'}
        </Text>
        <View style={styles.jobBadgeIcons}>
          {!job.team_lead_id && (
            <Users size={10} color="#fff" />
          )}
          {!job.has_deposit && job.status !== 'lead' && job.status !== 'quoted' && (
            <DollarSign size={10} color="#fff" />
          )}
          {isUpcoming && job.status === 'scheduled' && (
            <Clock size={10} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCalendarDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.calendarCell} />;
    }

    const dayJobs = getJobsForDate(date);
    const today = isToday(date);

    return (
      <View
        key={date.toISOString()}
        style={[styles.calendarCell, today && styles.todayCell]}
      >
        <Text style={[styles.dayNumber, today && styles.todayNumber]}>
          {date.getDate()}
        </Text>
        <ScrollView
          style={styles.jobsContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {dayJobs.slice(0, 3).map(renderJobBadge)}
          {dayJobs.length > 3 && (
            <Text style={styles.moreJobsText}>+{dayJobs.length - 3} more</Text>
          )}
        </ScrollView>
        {dayJobs.length > 0 && (
          <View style={styles.jobCountBadge}>
            <Text style={styles.jobCountText}>{dayJobs.length}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dates = getMonthDates();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth(-1)}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatMonthYear()}</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateMonth(1)}
          >
            <ChevronRight size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
          <Calendar size={16} color="#2563eb" />
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.weekHeader}>
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={styles.weekHeaderCell}>
            <Text style={styles.weekHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.calendarGrid} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarRows}>
          {Array.from({ length: Math.ceil(dates.length / 7) }).map((_, weekIndex) => (
            <View key={weekIndex} style={styles.calendarRow}>
              {dates.slice(weekIndex * 7, (weekIndex + 1) * 7).map((date, dayIndex) =>
                renderCalendarDay(date, weekIndex * 7 + dayIndex)
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.refreshingIndicator}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 180,
    textAlign: 'center',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  weekHeaderCell: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flex: 1,
  },
  calendarRows: {
    flex: 1,
  },
  calendarRow: {
    flexDirection: 'row',
    minHeight: 100,
  },
  calendarCell: {
    flex: 1,
    minHeight: 100,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    padding: 4,
    position: 'relative',
  },
  todayCell: {
    backgroundColor: '#eff6ff',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  todayNumber: {
    color: '#2563eb',
    fontWeight: '700',
  },
  jobsContainer: {
    flex: 1,
    maxHeight: 70,
  },
  jobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  jobBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  jobBadgeIcons: {
    flexDirection: 'row',
    gap: 2,
  },
  moreJobsText: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
  jobCountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobCountText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  refreshingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
