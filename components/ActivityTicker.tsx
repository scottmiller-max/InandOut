import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Clock, Truck, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, MapPin } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface TickerItem {
  id: string;
  type: 'milestone' | 'update' | 'alert';
  icon: 'clock' | 'truck' | 'check' | 'alert' | 'location';
  text: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

interface ActivityTickerProps {
  style?: any;
}

export const ActivityTicker: React.FC<ActivityTickerProps> = ({ style }) => {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(width - 40);

  useEffect(() => {
    loadTickerData();
    startTickerAnimation();
  }, []);

  const loadTickerData = () => {
    // Mock ticker data - replace with real-time data from messaging service
    const mockItems: TickerItem[] = [
      {
        id: '1',
        type: 'milestone',
        icon: 'truck',
        text: 'Team departed from Oak Street • ETA 2:45 PM',
        timestamp: new Date().toISOString(),
        priority: 'high',
      },
      {
        id: '2',
        type: 'update',
        icon: 'location',
        text: 'Currently on I-95 North • 15 minutes away',
        timestamp: new Date().toISOString(),
        priority: 'medium',
      },
      {
        id: '3',
        type: 'milestone',
        icon: 'check',
        text: 'Packing completed at 12:30 PM • All items secured',
        timestamp: new Date().toISOString(),
        priority: 'medium',
      },
      {
        id: '4',
        type: 'alert',
        icon: 'alert',
        text: 'Minor traffic delay • New ETA 3:00 PM',
        timestamp: new Date().toISOString(),
        priority: 'high',
      },
      {
        id: '5',
        type: 'milestone',
        icon: 'truck',
        text: 'Loading started at 11:45 AM • Estimated 45 minutes',
        timestamp: new Date().toISOString(),
        priority: 'low',
      },
    ];

    setTickerItems(mockItems);
  };

  const startTickerAnimation = () => {
    const totalWidth = tickerItems.length * 300; // Approximate width per item
    
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -totalWidth,
        duration: totalWidth * 50, // Adjust speed here
        useNativeDriver: true,
      })
    ).start();
  };

  const getIcon = (iconType: string) => {
    const iconProps = { size: 16, color: '#ffffff' };
    switch (iconType) {
      case 'clock': return <Clock {...iconProps} />;
      case 'truck': return <Truck {...iconProps} />;
      case 'check': return <CheckCircle {...iconProps} />;
      case 'alert': return <AlertTriangle {...iconProps} />;
      case 'location': return <MapPin {...iconProps} />;
      default: return <Clock {...iconProps} />;
    }
  };

  const getItemColor = (type: string, priority: string) => {
    if (priority === 'high') return '#dc2626';
    if (type === 'milestone') return '#2563eb';
    if (type === 'alert') return '#f59e0b';
    return '#059669';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tickerContainer}>
        <Animated.View
          style={[
            styles.tickerContent,
            {
              transform: [{ translateX: scrollX }],
            },
          ]}
        >
          {tickerItems.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.tickerItem}>
              <View style={[styles.tickerIcon, { backgroundColor: getItemColor(item.type, item.priority) }]}>
                {getIcon(item.icon)}
              </View>
              <Text style={styles.tickerText}>{item.text}</Text>
              <Text style={styles.tickerTime}>{formatTime(item.timestamp)}</Text>
            </View>
          ))}
          {/* Duplicate items for seamless loop */}
          {tickerItems.map((item, index) => (
            <View key={`${item.id}-duplicate-${index}`} style={styles.tickerItem}>
              <View style={[styles.tickerIcon, { backgroundColor: getItemColor(item.type, item.priority) }]}>
                {getIcon(item.icon)}
              </View>
              <Text style={styles.tickerText}>{item.text}</Text>
              <Text style={styles.tickerTime}>{formatTime(item.timestamp)}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    height: 60,
  },
  tickerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
    minWidth: 280,
  },
  tickerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  tickerTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  loadingContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
});