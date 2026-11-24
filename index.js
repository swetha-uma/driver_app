import { registerRootComponent } from 'expo';

// Why: register background alert-call task before the UI mounts (lock-screen wakes)
import './src/features/alertcall/driverAlertCallTask';
// Why: register van GPS background task before UI so lock / swipe-away still publishes lat/long
import './src/features/settings/frontend/services/driverVanGpsBackgroundTask';

import App from './App';

registerRootComponent(App);
