package expo.modules.incomingalertcall

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager

/**
 * Starts the native call Activity and posts a CATEGORY_CALL full-screen-intent notification.
 * Why: tray-only alerts require a tap; FSI + startActivity bring Answer/Reject to the front.
 */
object IncomingAlertCallPresenter {
  // Why: separate channel from Expo's so we control CALL category + ringtone
  private const val CHANNEL_ID = "driver-alert-call-native"
  private const val NOTIFICATION_ID = 71001

  fun present(context: Context) {
    val appContext = context.applicationContext
    ensureChannel(appContext)
    // Why: wake the CPU briefly so the Activity can start while the screen is off
    wakeScreenBriefly(appContext)

    val activityIntent = buildActivityIntent(appContext)
    // Why: try direct launch first (works when the process may start activities)
    try {
      appContext.startActivity(activityIntent)
    } catch (_: Exception) {
      // Why: fall through to FSI notification which Android allows over the lock screen
    }
    // Why: full-screen intent is the reliable path when locked / another app is in front
    postFullScreenNotification(appContext, activityIntent)
  }

  fun cancelNotification(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(NOTIFICATION_ID)
  }

  fun launchMainApp(context: Context, answered: Boolean, payload: Map<String, String>) {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    launch.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_SINGLE_TOP or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
    )
    launch.putExtra(IncomingAlertCallActivity.EXTRA_ANSWERED, answered)
    launch.putExtra(IncomingAlertCallActivity.EXTRA_TITLE, payload["title"])
    launch.putExtra(IncomingAlertCallActivity.EXTRA_TITLE_TAMIL, payload["titleTamil"])
    launch.putExtra(IncomingAlertCallActivity.EXTRA_BODY, payload["body"])
    launch.putExtra(IncomingAlertCallActivity.EXTRA_BODY_TAMIL, payload["bodyTamil"])
    launch.putExtra(IncomingAlertCallActivity.EXTRA_TRIP_ID, payload["tripId"])
    launch.putExtra(IncomingAlertCallActivity.EXTRA_STUDENT_ID, payload["studentId"])
    try {
      context.startActivity(launch)
    } catch (_: Exception) {
    }
  }

  private fun wakeScreenBriefly(context: Context) {
    try {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      @Suppress("DEPRECATION")
      val wakeLock = power.newWakeLock(
        PowerManager.FULL_WAKE_LOCK or
          PowerManager.ACQUIRE_CAUSES_WAKEUP or
          PowerManager.ON_AFTER_RELEASE,
        "driverapp:incoming-alert-call",
      )
      // Why: short hold is enough for the Activity + ringtone to start
      wakeLock.acquire(3000L)
      wakeLock.release()
    } catch (_: Exception) {
      // Why: some OEMs block wake locks — FSI notification still tries to open the Activity
    }
  }

  private fun buildActivityIntent(context: Context): Intent {
    return Intent(context, IncomingAlertCallActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
      )
      putExtra(IncomingAlertCallActivity.EXTRA_TITLE, IncomingAlertCallStore.title)
      putExtra(IncomingAlertCallActivity.EXTRA_TITLE_TAMIL, IncomingAlertCallStore.titleTamil)
      putExtra(IncomingAlertCallActivity.EXTRA_BODY, IncomingAlertCallStore.body)
      putExtra(IncomingAlertCallActivity.EXTRA_BODY_TAMIL, IncomingAlertCallStore.bodyTamil)
      putExtra(IncomingAlertCallActivity.EXTRA_TRIP_ID, IncomingAlertCallStore.tripId)
      putExtra(IncomingAlertCallActivity.EXTRA_STUDENT_ID, IncomingAlertCallStore.studentId)
    }
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    // Why: recreate if importance was lowered by the user so CALL can surface again
    val existing = manager.getNotificationChannel(CHANNEL_ID)
    if (existing != null && existing.importance >= NotificationManager.IMPORTANCE_HIGH) {
      return
    }
    if (existing != null) {
      manager.deleteNotificationChannel(CHANNEL_ID)
    }
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Driver alert call",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Full-screen incoming alert calls"
      setBypassDnd(true)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 800, 400, 800, 400, 800)
      val ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      setSound(
        ringtone,
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun postFullScreenNotification(context: Context, activityIntent: Intent) {
    val fullScreen = PendingIntent.getActivity(
      context,
      NOTIFICATION_ID,
      activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val content = PendingIntent.getActivity(
      context,
      NOTIFICATION_ID + 1,
      activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }

    @Suppress("DEPRECATION")
    val notification = builder
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(IncomingAlertCallStore.title)
      .setContentText("Incoming alert call")
      // Why: CATEGORY_CALL tells Android to treat this like a phone call (prefer FSI)
      .setCategory(Notification.CATEGORY_CALL)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(content)
      // Why: true = launch IncomingAlertCallActivity over the lock screen
      .setFullScreenIntent(fullScreen, true)
      .setPriority(Notification.PRIORITY_MAX)
      .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
      .build()

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, notification)
  }
}
