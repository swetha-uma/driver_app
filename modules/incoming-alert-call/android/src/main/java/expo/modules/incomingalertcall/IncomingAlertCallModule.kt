package expo.modules.incomingalertcall

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS bridge: present / dismiss the native full-screen alert call, and emit Answer / Reject.
 */
class IncomingAlertCallModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IncomingAlertCall")

    Events(EVENT_OPENED, EVENT_ANSWERED, EVENT_REJECTED)

    OnCreate {
      moduleInstance = this@IncomingAlertCallModule
    }

    OnDestroy {
      if (moduleInstance === this@IncomingAlertCallModule) {
        moduleInstance = null
      }
    }

    AsyncFunction("present") { params: Map<String, Any?> ->
      val title = params["title"] as? String
      val titleTamil = params["titleTamil"] as? String
      val body = params["body"] as? String
      val bodyTamil = params["bodyTamil"] as? String
      val tripId = params["tripId"] as? String
      val studentId = params["studentId"] as? String
      IncomingAlertCallStore.put(title, titleTamil, body, bodyTamil, tripId, studentId)
      val context = appContext.reactContext ?: appContext.applicationContext
        ?: return@AsyncFunction null
      IncomingAlertCallPresenter.present(context)
      null
    }

    Function("dismiss") {
      IncomingAlertCallRingtone.stop()
      val context = appContext.reactContext ?: appContext.applicationContext
      if (context != null) {
        IncomingAlertCallPresenter.cancelNotification(context)
      }
      IncomingAlertCallStore.clear()
      null
    }

    Function("isActive") {
      IncomingAlertCallStore.active
    }

    // Why: JS polls this after resume when Answer happened while the app was dead
    Function("consumePendingAnswered") {
      IncomingAlertCallStore.consumePendingAnswered()
    }

    /**
     * True when Android will allow the blue call screen over lock / other apps.
     * Why: Android 14+ needs a separate "full screen notifications" toggle.
     */
    Function("canUseFullScreenIntent") {
      val context = appContext.reactContext ?: appContext.applicationContext
        ?: return@Function true
      // Why: private helper — avoid name clash with this Function id
      checkFullScreenIntentAllowed(context)
    }

    /**
     * Opens the system screen where the driver turns on full-screen notifications.
     * Why: there is no runtime dialog for this permission — Settings is required.
     */
    Function("openFullScreenIntentSettings") {
      val context = appContext.reactContext ?: appContext.applicationContext
        ?: return@Function false
      launchFullScreenIntentSettings(context)
    }
  }

  /** Android 14+ checks NotificationManager; older versions treat FSI as allowed. */
  private fun checkFullScreenIntentAllowed(context: Context): Boolean {
    // Why: before API 34 the manifest permission is enough
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true
    }
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      ?: return true
    return try {
      manager.canUseFullScreenIntent()
    } catch (_: Exception) {
      true
    }
  }

  /** Deep-link to this app's full-screen notification setting (or app details fallback). */
  private fun launchFullScreenIntentSettings(context: Context): Boolean {
    return try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        // Why: dedicated FSI settings page on Android 14+
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
          data = Uri.parse("package:${context.packageName}")
        }
      } else {
        // Why: older Android — open app details so the driver can review notification access
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
        }
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    } catch (_: Exception) {
      try {
        val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(fallback)
        true
      } catch (_: Exception) {
        false
      }
    }
  }

  companion object {
    const val EVENT_OPENED = "incomingAlertCallOpened"
    const val EVENT_ANSWERED = "incomingAlertCallAnswered"
    const val EVENT_REJECTED = "incomingAlertCallRejected"

    @Volatile
    private var moduleInstance: IncomingAlertCallModule? = null

    fun emitOpened(payload: Map<String, String>) {
      moduleInstance?.sendEvent(EVENT_OPENED, payload)
    }

    fun emitAnswered(payload: Map<String, String>) {
      moduleInstance?.sendEvent(EVENT_ANSWERED, payload)
    }

    fun emitRejected(payload: Map<String, String>) {
      moduleInstance?.sendEvent(EVENT_REJECTED, payload)
    }
  }
}
