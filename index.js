import { registerRootComponent } from 'expo';

// Why: register background alert-call task before the UI mounts (lock-screen wakes)
import './src/features/alertcall/driverAlertCallTask';

import App from './App';

registerRootComponent(App);
