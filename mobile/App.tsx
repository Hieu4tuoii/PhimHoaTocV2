import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home, Compass, Search, Heart, Clock } from 'lucide-react-native';

// Theme & Store
import { COLORS } from './src/theme/colors';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import SearchScreen from './src/screens/SearchScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import WatchScreen from './src/screens/WatchScreen';

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  MovieDetail: { slug: string };
  Watch: {
    slug: string;
    movieName: string;
    movieThumb: string;
    episodeSlug: string;
    episodeName: string;
  };
};

export type TabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  SearchTab: undefined;
  WatchlistTab: undefined;
  HistoryTab: undefined;
};

// Create Navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Create TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

const linking = {
  prefixes: ['phimhoatoc://', 'https://phimhoatoc.vn', 'https://*.phimhoatoc.vn'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          HomeTab: 'trang-chu',
          ExploreTab: 'kham-pha',
          SearchTab: 'tim-kiem',
          WatchlistTab: 'watchlist',
          HistoryTab: 'lich-su',
        },
      },
      MovieDetail: 'phim/:slug',
      Watch: 'xem-phim/:slug/:episodeSlug',
    },
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconProps = { color, size: 22 };
          switch (route.name) {
            case 'HomeTab':
              return <Home {...iconProps} />;
            case 'ExploreTab':
              return <Compass {...iconProps} />;
            case 'SearchTab':
              return <Search {...iconProps} />;
            case 'WatchlistTab':
              return <Heart {...iconProps} />;
            case 'HistoryTab':
              return <Clock {...iconProps} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.zinc400,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: COLORS.zinc800,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.zinc800,
        },
        headerTintColor: COLORS.foreground,
        headerTitleStyle: {
          fontWeight: 'black',
          fontSize: 18,
          letterSpacing: 0.5,
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ 
          title: 'Trang chủ',
          headerShown: false, // We'll build a custom transparent floating header like web
        }} 
      />
      <Tab.Screen 
        name="ExploreTab" 
        component={ExploreScreen} 
        options={{ 
          title: 'Khám phá',
          headerTitle: 'KHÁM PHÁ PHIM',
        }} 
      />
      <Tab.Screen 
        name="SearchTab" 
        component={SearchScreen} 
        options={{ 
          title: 'Tìm kiếm',
          headerTitle: 'TÌM KIẾM PHIM',
        }} 
      />
      <Tab.Screen 
        name="WatchlistTab" 
        component={WatchlistScreen} 
        options={{ 
          title: 'Yêu thích',
          headerTitle: 'PHIM YÊU THÍCH',
        }} 
      />
      <Tab.Screen 
        name="HistoryTab" 
        component={HistoryScreen} 
        options={{ 
          title: 'Lịch sử',
          headerTitle: 'LỊCH SỬ XEM PHIM',
        }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <RootStack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.background,
              },
              headerTintColor: COLORS.foreground,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              contentStyle: {
                backgroundColor: COLORS.background,
              },
            }}
          >
            <RootStack.Screen 
              name="MainTabs" 
              component={TabNavigator} 
              options={{ headerShown: false }} 
            />
            <RootStack.Screen 
              name="MovieDetail" 
              component={MovieDetailScreen} 
              options={{ 
                title: 'Chi tiết',
                headerShown: false, // Detail has its own header with poster backdrop
              }} 
            />
            <RootStack.Screen 
              name="Watch" 
              component={WatchScreen} 
              options={{ 
                title: 'Xem Phim',
                headerShown: false, // Video player will be fullscreen
                orientation: 'all', // Support landscape rotation
              }} 
            />
          </RootStack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" backgroundColor="#000000" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
