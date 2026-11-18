package expo.modules.nativeblescanner

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager

private const val CHANNEL_ID = "ble_gateway_scan"
private const val CHANNEL_NAME = "BLE gateway scanning"
private const val NOTIFICATION_ID = 4101
private const val NOTIFICATION_TITLE = "BLE gateway is running"
private const val NOTIFICATION_TEXT = "Receiving zone and ID cards"
private const val WAKE_LOCK_TAG = "NativeBleScanner:scan"
const val ACTION_STOP = "expo.modules.nativeblescanner.STOP_SCAN"

/**
 * Owns the gateway scan. Start keeps it alive with the screen locked. After a swipe-away,
 * Android starts this service again and the scan resumes. Force stop in system settings
 * still ends it until the driver opens the app and taps Start.
 */
class ScanForegroundService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP || !GatewayScanRuntime.isArmed(this)) {
      GatewayScanRuntime.setArmed(this, false)
      GatewayScanRuntime.stop(this)
      releaseWakeLock()
      stopForeground(true)
      stopSelf()
      return START_NOT_STICKY
    }
    createNotificationChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    acquireWakeLock()
    GatewayScanRuntime.start(this)
    return START_STICKY
  }

  override fun onDestroy() {
    releaseWakeLock()
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW)
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      Notification.Builder(this)
    }
    return builder
      .setContentTitle(NOTIFICATION_TITLE)
      .setContentText(NOTIFICATION_TEXT)
      .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
      .setOngoing(true)
      .setContentIntent(buildOpenAppIntent())
      .build()
  }

  private fun buildOpenAppIntent(): PendingIntent? {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE)
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG).also {
      it.acquire()
    }
  }

  private fun releaseWakeLock() {
    wakeLock?.takeIf { it.isHeld }?.release()
    wakeLock = null
  }
}
