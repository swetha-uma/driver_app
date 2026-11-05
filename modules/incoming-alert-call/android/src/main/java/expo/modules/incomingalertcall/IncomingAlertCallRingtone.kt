package expo.modules.incomingalertcall

import android.content.Context
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Loops the phone ringtone + vibration until Answer / Reject.
 */
object IncomingAlertCallRingtone {
  private var ringtone: Ringtone? = null
  private val handler = Handler(Looper.getMainLooper())
  private var vibrator: Vibrator? = null

  private val keepRinging = object : Runnable {
    override fun run() {
      val current = ringtone ?: return
      try {
        if (!current.isPlaying) {
          current.play()
        }
      } catch (_: Exception) {
      }
      // Why: keep restarting so the tone does not die after one cycle
      handler.postDelayed(this, 900)
    }
  }

  private val pulseVibrate = object : Runnable {
    override fun run() {
      val vib = vibrator ?: return
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          vib.vibrate(VibrationEffect.createOneShot(600, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
          @Suppress("DEPRECATION")
          vib.vibrate(600)
        }
      } catch (_: Exception) {
      }
      handler.postDelayed(this, 2000)
    }
  }

  fun start(context: Context) {
    stop()
    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      ?: return
    val next = RingtoneManager.getRingtone(context.applicationContext, uri) ?: return
    next.audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      next.isLooping = true
    }
    try {
      next.play()
    } catch (_: Exception) {
      return
    }
    ringtone = next
    handler.post(keepRinging)

    vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val manager = context.getSystemService(VibratorManager::class.java)
      manager?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    handler.postDelayed(pulseVibrate, 400)
  }

  fun stop() {
    handler.removeCallbacks(keepRinging)
    handler.removeCallbacks(pulseVibrate)
    val current = ringtone
    ringtone = null
    if (current != null) {
      try {
        if (current.isPlaying) current.stop()
      } catch (_: Exception) {
      }
    }
    try {
      vibrator?.cancel()
    } catch (_: Exception) {
    }
    vibrator = null
  }
}
