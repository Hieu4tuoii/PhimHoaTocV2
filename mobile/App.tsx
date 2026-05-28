import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home, Search, Heart, Clock } from 'lucide-react-native';

import { COLORS } from './src/theme/colors';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import WatchScreen from './src/screens/WatchScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  MovieDetail: {
    slug: string;
    // Optional preview data passed from cards so detail header can render instantly
    name?: string;
    thumb_url?: string;
    poster_url?: string;
  };
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
  SearchTab: { typeFilter?: string } | undefined;
  WatchlistTab: undefined;
  HistoryTab: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['phimhoatoc://', 'https://phimhoatoc.vn', 'https://*.phimhoatoc.vn'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          HomeTab: 'trang-chu',
          // Mirror web: /kham-pha redirect sang /tim-kiem - cả 2 path map vào SearchTab
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
        tabBarIcon: ({ color }) => {
          const iconProps = { color, size: 22 };
          switch (route.name) {
            case 'HomeTab':
              return <Home {...iconProps} />;
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
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'Khám phá',
          headerShown: false,
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.background }}>
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
                gestureEnabled: true,
                animation: 'slide_from_right',
                animationDuration: 220,
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
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="Watch"
                component={WatchScreen}
                options={{
                  title: 'Xem Phim',
                  headerShown: false,
                  orientation: 'all',
                  animation: 'fade',
                  statusBarHidden: true,
                  navigationBarHidden: true,
                  homeIndicatorHidden: true,
                }}
              />
            </RootStack.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
