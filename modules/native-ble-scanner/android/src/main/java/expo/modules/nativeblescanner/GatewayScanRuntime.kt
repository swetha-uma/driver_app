package expo.modules.nativeblescanner

import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * One Bluetooth scan for the driver gateway. The foreground service owns it, so a locked
 * screen or a swipe-away can keep posting /api/ble_capture without the React thread.
 */
object GatewayScanRuntime {
  private const val PREFS = "gateway_scan"
  private const val KEY_ARMED = "armed"
  private const val KEY_URL = "url"
  private const val KEY_GMAC = "gmac"
  private const val KEY_GATEWAY = "gatewayId"
  private const val MIN_RSSI = -90
  private const val POST_GAP_MS = 10_000L

  private val mainHandler = Handler(Looper.getMainLooper())
  private val uploader = Executors.newSingleThreadExecutor()
  private val lastPostedAt = ConcurrentHashMap<String, Long>()
  private var callback: ScanCallback? = null
  private var listener: ((ScanResult) -> Unit)? = null
  @Volatile private var scanning = false

  fun isScanning(): Boolean = scanning

  fun rememberUpload(context: Context, url: String, gmac: String, gatewayId: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(KEY_URL, url)
      .putString(KEY_GMAC, gmac)
      .putString(KEY_GATEWAY, gatewayId)
      .apply()
  }

  fun setArmed(context: Context, armed: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean(KEY_ARMED, armed)
      .apply()
    if (!armed) lastPostedAt.clear()
  }

  fun isArmed(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ARMED, false)

  fun setListener(next: ((ScanResult) -> Unit)?) {
    listener = next
  }

  @Synchronized
  fun start(context: Context) {
    if (scanning) return
    val scanner = scanner(context) ?: return
    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
      .setReportDelay(0L)
      .apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          setLegacy(false)
          setPhy(ScanSettings.PHY_LE_ALL_SUPPORTED)
        }
      }
      .build()
    val next = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult) {
        deliver(result)
      }

      override fun onBatchScanResults(results: MutableList<ScanResult>) {
        results.forEach { deliver(it) }
      }
    }
    try {
      scanner.startScan(null, settings, next)
      callback = next
      scanning = true
    } catch (_: Exception) {
      scanning = false
      callback = null
    }
  }

  @Synchronized
  fun stop(context: Context) {
    val active = callback
    callback = null
    scanning = false
    listener = null
    if (active != null) {
      try {
        scanner(context)?.stopScan(active)
      } catch (_: Exception) {
        // The adapter may already be off.
      }
    }
  }

  private fun deliver(result: ScanResult) {
    val seen = listener
    if (seen != null) {
      mainHandler.post { seen.invoke(result) }
    }
    val appContext = appContext ?: return
    if (result.rssi < MIN_RSSI) return
    val mac = result.device.address ?: return
    val now = SystemClock.elapsedRealtime()
    val previous = lastPostedAt[mac] ?: 0L
    if (now - previous < POST_GAP_MS) return
    lastPostedAt[mac] = now
    uploader.execute { post(appContext, mac, result.rssi) }
  }

  private var appContext: Context? = null

  private fun scanner(context: Context): BluetoothLeScanner? {
    appContext = context.applicationContext
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = manager?.adapter ?: return null
    if (!adapter.isEnabled) return null
    return adapter.bluetoothLeScanner
  }

  private fun post(context: Context, mac: String, rssi: Int) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val url = prefs.getString(KEY_URL, null) ?: return
    val gmac = prefs.getString(KEY_GMAC, null) ?: return
    if (url.isBlank() || gmac.isBlank()) return
    val clock = isoNow()
    val body = JSONObject()
      .put("Gateway_ID", prefs.getString(KEY_GATEWAY, null) ?: "PHONE_LOCAL")
      .put("GMAC", gmac)
      .put("DMAC", mac)
      .put("RSSI", rssi.toString())
      .put("time", clock)
      .put("Timestamp", clock)
      .put("detectedAt", clock)
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      connectTimeout = 8000
      readTimeout = 8000
      doOutput = true
      setRequestProperty("Content-Type", "application/json")
      setRequestProperty("Accept", "application/json")
    }
    try {
      connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
      connection.inputStream?.close() ?: connection.errorStream?.close()
    } catch (_: Exception) {
      // The next sighting of this card retries after the gap.
      lastPostedAt.remove(mac)
    } finally {
      connection.disconnect()
    }
  }

  private fun isoNow(): String {
    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    format.timeZone = TimeZone.getTimeZone("UTC")
    return format.format(Date())
  }
}
