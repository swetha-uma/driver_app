package expo.modules.deviceringtone

import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Plays the phone's own ringtone until stop() is called (Answer or Reject).
 * Keeps re-starting the tone so it rings for the whole incoming-call screen.
 */
class DeviceRingtoneModule : Module() {
  private var ringtone: Ringtone? = null
  private val handler = Handler(Looper.getMainLooper())
  private val keepRinging = object : Runnable {
    override fun run() {
      val current = ringtone ?: return
      try {
        if (!current.isPlaying) {
          current.play()
        }
      } catch (_: Exception) {
      }
      // Keep the ringtone alive until the driver Answers or Rejects.
      handler.postDelayed(this, 900)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("DeviceRingtone")

    AsyncFunction("start") {
      stopInternal()
      val context = appContext.reactContext ?: return@AsyncFunction null
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        ?: return@AsyncFunction null
      val next = RingtoneManager.getRingtone(context, uri) ?: return@AsyncFunction null
      next.audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        next.isLooping = true
      }
      next.play()
      ringtone = next
      handler.post(keepRinging)
      null
    }

    Function("stop") {
      stopInternal()
      null
    }

    OnDestroy {
      stopInternal()
    }
  }

  private fun stopInternal() {
    handler.removeCallbacks(keepRinging)
    val current = ringtone
    ringtone = null
    if (current == null) return
    try {
      if (current.isPlaying) current.stop()
    } catch (_: Exception) {
    }
  }
}
