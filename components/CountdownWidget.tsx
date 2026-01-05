import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';

interface CountdownWidgetProps {
  moveDate: string;
  style?: any;
}

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ moveDate, style }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const moveDateTime = new Date(moveDate).getTime();
      const difference = moveDateTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [moveDate]);

  const formatMoveDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isToday = () => {
    const today = new Date();
    const move = new Date(moveDate);
    return today.toDateString() === move.toDateString();
  };

  const isPast = () => {
    const now = new Date();
    const move = new Date(moveDate);
    return move < now;
  };

  if (isPast()) {
    return (
      <View style={[styles.container, styles.completedContainer, style]}>
        <Calendar size={20} color="#10b981" />
        <View style={styles.content}>
          <Text style={styles.completedTitle}>Move Completed!</Text>
          <Text style={styles.completedDate}>{formatMoveDate(moveDate)}</Text>
        </View>
      </View>
    );
  }

  if (isToday()) {
    return (
      <View style={[styles.container, styles.todayContainer, style]}>
        <Clock size={20} color="#f59e0b" />
        <View style={styles.content}>
          <Text style={styles.todayTitle}>Moving Day is TODAY!</Text>
          <Text style={styles.todaySubtitle}>We'll have you IN and OUT soon!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Calendar size={20} color="#2563eb" />
      <View style={styles.content}>
        <Text style={styles.title}>We'll have you IN and OUT in</Text>
        <View style={styles.countdown}>
          {timeLeft.days > 0 && (
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{timeLeft.days}</Text>
              <Text style={styles.timeLabel}>{timeLeft.days === 1 ? 'day' : 'days'}</Text>
            </View>
          )}
          {(timeLeft.days > 0 || timeLeft.hours > 0) && (
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{timeLeft.hours}</Text>
              <Text style={styles.timeLabel}>{timeLeft.hours === 1 ? 'hour' : 'hours'}</Text>
            </View>
          )}
          {timeLeft.days === 0 && (
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{timeLeft.minutes}</Text>
              <Text style={styles.timeLabel}>{timeLeft.minutes === 1 ? 'min' : 'mins'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.moveDate}>{formatMoveDate(moveDate)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayContainer: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  completedContainer: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeUnit: {
    alignItems: 'center',
    marginRight: 16,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
  },
  timeLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
  },
  moveDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
    fontFamily: 'Inter-Bold',
  },
  todaySubtitle: {
    fontSize: 12,
    color: '#92400e',
    fontFamily: 'Inter-Medium',
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter-Bold',
  },
  completedDate: {
    fontSize: 12,
    color: '#047857',
    fontFamily: 'Inter-Medium',
  },
});