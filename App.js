import { useEffect } from 'react';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { DRIVER_STUDENT_STILL_ON_VAN_FCM_TYPE } from './src/constants/alertCall';
import { ensureTeacherNoticeChannel } from './src/features/teacherapp/push/ensureTeacherNoticeChannel';
import AppNavigator from './src/navigation/AppNavigator';

// Why: play phone notification sound for late/leave tray alerts (Trip ring uses native UI)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = String(notification?.request?.content?.data?.type || '');
    const isStillOnVan = type === DRIVER_STUDENT_STILL_ON_VAN_FCM_TYPE;
    return {
      shouldShowBanner: !isStillOnVan,
      shouldShowList: true,
      shouldPlaySound: !isStillOnVan,
      shouldSetBadge: false,
    };
  },
});

/** Root of the teacher app. Keeps screens inside the phone safe area. */
export default function App() {
  useEffect(() => {
    ensureTeacherNoticeChannel().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
