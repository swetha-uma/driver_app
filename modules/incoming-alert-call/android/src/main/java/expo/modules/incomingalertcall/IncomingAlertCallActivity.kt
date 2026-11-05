package expo.modules.incomingalertcall

import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

/**
 * Full-screen incoming alert call — opens over the lock screen and rings until Answer / Reject.
 */
class IncomingAlertCallActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Why: wake + show over lock screen like a normal phone call
    enableLockScreenPresentation()
    setContentView(R.layout.activity_incoming_alert_call)

    applyExtras(intent)
    findViewById<TextView>(R.id.incoming_title).text = IncomingAlertCallStore.title
    findViewById<Button>(R.id.incoming_reject).setOnClickListener { onReject() }
    findViewById<Button>(R.id.incoming_answer).setOnClickListener { onAnswer() }

    // Why: start ringtone as soon as this Activity appears (no tray tap needed)
    IncomingAlertCallRingtone.start(this)
    IncomingAlertCallModule.emitOpened(IncomingAlertCallStore.toMap())
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    applyExtras(intent)
    findViewById<TextView>(R.id.incoming_title).text = IncomingAlertCallStore.title
    if (IncomingAlertCallStore.active) {
      IncomingAlertCallRingtone.start(this)
    }
  }

  override fun onDestroy() {
    // Why: leaving the screen must never leave the phone ringing
    IncomingAlertCallRingtone.stop()
    super.onDestroy()
  }

  private fun enableLockScreenPresentation() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val keyguard = getSystemService(KeyguardManager::class.java)
      keyguard?.requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  private fun applyExtras(intent: Intent?) {
    if (intent == null) return
    // Why: Intent extras win when the FSI notification launches this Activity cold
    val title = intent.getStringExtra(EXTRA_TITLE)
    val body = intent.getStringExtra(EXTRA_BODY)
    if (title != null || body != null || intent.hasExtra(EXTRA_TRIP_ID)) {
      IncomingAlertCallStore.put(
        title = title,
        titleTamil = intent.getStringExtra(EXTRA_TITLE_TAMIL),
        body = body,
        bodyTamil = intent.getStringExtra(EXTRA_BODY_TAMIL),
        tripId = intent.getStringExtra(EXTRA_TRIP_ID),
        studentId = intent.getStringExtra(EXTRA_STUDENT_ID),
      )
    }
  }

  private fun onReject() {
    IncomingAlertCallRingtone.stop()
    IncomingAlertCallPresenter.cancelNotification(this)
    val payload = IncomingAlertCallStore.toMap()
    IncomingAlertCallStore.clear()
    IncomingAlertCallModule.emitRejected(payload)
    finish()
  }

  private fun onAnswer() {
    IncomingAlertCallRingtone.stop()
    IncomingAlertCallPresenter.cancelNotification(this)
    val payload = IncomingAlertCallStore.toMap()
    // Why: persist until JS consumes — module may not be loaded yet when app was killed
    IncomingAlertCallStore.rememberAnswered(payload)
    IncomingAlertCallStore.clear()
    IncomingAlertCallModule.emitAnswered(payload)
    // Why: bring the React app forward so TTS / attended UI can run in JS
    IncomingAlertCallPresenter.launchMainApp(this, answered = true, payload)
    finish()
  }

  companion object {
    const val EXTRA_TITLE = "title"
    const val EXTRA_TITLE_TAMIL = "titleTamil"
    const val EXTRA_BODY = "body"
    const val EXTRA_BODY_TAMIL = "bodyTamil"
    const val EXTRA_TRIP_ID = "tripId"
    const val EXTRA_STUDENT_ID = "studentId"
    const val EXTRA_ANSWERED = "answered"
  }
}
