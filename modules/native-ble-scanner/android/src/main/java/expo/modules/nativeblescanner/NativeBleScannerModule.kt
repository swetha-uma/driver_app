package expo.modules.nativeblescanner

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Android silently blocks scanning after 5 starts within 30 s, so stay below that.
private const val MAX_STARTS_PER_WINDOW = 4
private const val START_WINDOW_MS = 30_000L
private const val SILENCE_BEFORE_RESTART_MS = 20_000L
private const val MIN_MS_BETWEEN_WATCHDOG_RESTARTS = 60_000L
private const val WATCHDOG_TICK_MS = 5_000L
private const val RESTART_DELAY_MS = 800L

private enum class ScanProfile(val label: String) {
  LEGACY_AND_EXTENDED("low-latency, legacy + extended adverts"),
  LOW_LATENCY("low-latency, default adverts"),
  BARE("bare default settings"),
}

class NativeBleScannerModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val startTimes = ArrayDeque<Long>()
  private var scanCallback: ScanCallback? = null
  private var wantScanning = false
  private var profile = ScanProfile.LEGACY_AND_EXTENDED
  private var resultCount = 0
  private var restartCount = 0
  private var lastResultAt = 0L
  private var lastWatchdogRestartAt = 0L

  private val watchdog = object : Runnable {
    override fun run() {
      if (!wantScanning) return
      val now = SystemClock.elapsedRealtime()
      val silentForMs = now - lastResultAt
      val canRestart = now - lastWatchdogRestartAt > MIN_MS_BETWEEN_WATCHDOG_RESTARTS
      if (silentForMs > SILENCE_BEFORE_RESTART_MS && canRestart) {
        lastWatchdogRestartAt = now
        emitStatus("No Bluetooth packets for ${silentForMs / 1000}s. Restarting the scan once.")
        stopInternal()
        mainHandler.postDelayed({ restartIfWanted() }, RESTART_DELAY_MS)
      }
      mainHandler.postDelayed(this, WATCHDOG_TICK_MS)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("NativeBleScanner")

    Events("onAdvertisement", "onScanError", "onScanStatus")

    AsyncFunction("isLocationEnabled") {
      isLocationEnabled()
    }

    AsyncFunction("isBluetoothEnabled") {
      isBluetoothEnabled()
    }

    AsyncFunction("openBluetoothSettings") {
      openBluetoothSettings()
    }

    AsyncFunction("openLocationSettings") {
      openLocationSettings()
    }

    // Why: system Deny/Allow dialog that turns Bluetooth ON when the driver taps Allow.
    AsyncFunction("requestEnableBluetooth") {
      requestEnableBluetooth()
    }

    // Why: opens the system Location panel so Allow / toggle can turn Location services ON.
    AsyncFunction("requestEnableLocation") {
      requestEnableLocation()
    }

    AsyncFunction("startScan") {
      wantScanning = true
      profile = ScanProfile.LEGACY_AND_EXTENDED
      resultCount = 0
      restartCount = 0
      try {
        startInternal()
      } catch (error: SecurityException) {
        wantScanning = false
        throw CodedException(
          "BLE_PERMISSION",
          "Nearby devices permission is missing. Allow it in the app settings.",
          error,
        )
      } catch (error: Exception) {
        wantScanning = false
        throw error
      }
      startWatchdog()
      profile.label
    }

    AsyncFunction("stopScan") {
      wantScanning = false
      stopWatchdog()
      stopInternal()
    }

    AsyncFunction("startScanService") {
      startScanService()
    }

    AsyncFunction("stopScanService") {
      stopScanService()
    }

    AsyncFunction("isIgnoringBatteryOptimizations") {
      isIgnoringBatteryOptimizations()
    }

    AsyncFunction("requestIgnoreBatteryOptimizations") {
      requestIgnoreBatteryOptimizations()
    }

    AsyncFunction("getStats") {
      mapOf(
        "results" to resultCount,
        "restarts" to restartCount,
        "profile" to profile.label,
      )
    }

    OnDestroy {
      wantScanning = false
      stopWatchdog()
      stopInternal()
    }
  }

  private fun isLocationEnabled(): Boolean {
    val context = appContext.reactContext ?: return false
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
      ?: return false
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      manager.isLocationEnabled
    } else {
      manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
        manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }
  }

  private fun isBluetoothEnabled(): Boolean {
    val context = appContext.reactContext ?: return false
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    return manager?.adapter?.isEnabled == true
  }

  private fun openBluetoothSettings() {
    val context = requireContext()
    val settingsIntent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(settingsIntent)
  }

  private fun openLocationSettings() {
    val context = requireContext()
    val settingsIntent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(settingsIntent)
  }

  /**
   * System dialog: allow this app to turn Bluetooth on.
   * Why: when the driver taps Allow, Android enables the Bluetooth radio automatically.
   */
  private fun requestEnableBluetooth() {
    val context = requireContext()
    if (isBluetoothEnabled()) return
    val enableIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(enableIntent)
  }

  /**
   * System Location settings so the driver can turn Location ON.
   * Why: Android does not allow apps to silently force Location services on.
   * Use ACTION_LOCATION_SOURCE_SETTINGS (stable on all SDKs) — Settings.Panel.ACTION_LOCATION
   * is missing from some compile SDKs and broke EAS `:native-ble-scanner:compileDebugKotlin`.
   */
  private fun requestEnableLocation() {
    val context = requireContext()
    if (isLocationEnabled()) return
    val locationIntent = Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(locationIntent)
  }

  private fun requireContext(): Context =
    appContext.reactContext
      ?: throw CodedException("BLE_CONTEXT", "App is not ready yet. Try again.", null)

  private fun startScanService() {
    val context = requireContext()
    val serviceIntent = Intent(context, ScanForegroundService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }
  }

  private fun stopScanService() {
    val context = requireContext()
    context.stopService(Intent(context, ScanForegroundService::class.java))
  }

  private fun isIgnoringBatteryOptimizations(): Boolean {
    val context = requireContext()
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return powerManager.isIgnoringBatteryOptimizations(context.packageName)
  }

  private fun requestIgnoreBatteryOptimizations() {
    val context = requireContext()
    val requestIntent = Intent(
      Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(requestIntent)
  }

  private fun requireScanner(): BluetoothLeScanner {
    val context = appContext.reactContext
      ?: throw CodedException("BLE_CONTEXT", "App is not ready yet. Try again.", null)
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = manager?.adapter
      ?: throw CodedException("BLE_ADAPTER", "This phone has no Bluetooth adapter.", null)
    if (!adapter.isEnabled) {
      throw CodedException("BLE_OFF", "Bluetooth is off. Turn Bluetooth ON.", null)
    }
    return adapter.bluetoothLeScanner
      ?: throw CodedException("BLE_SCANNER", "Bluetooth LE scanner is not available.", null)
  }

  private fun settingsFor(scanProfile: ScanProfile): ScanSettings {
    val builder = ScanSettings.Builder()
    if (scanProfile == ScanProfile.BARE) return builder.build()

    builder.setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).setReportDelay(0L)
    if (scanProfile == ScanProfile.LEGACY_AND_EXTENDED && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setLegacy(false)
      builder.setPhy(ScanSettings.PHY_LE_ALL_SUPPORTED)
    }
    return builder.build()
  }

  private fun canStartNow(): Boolean {
    val now = SystemClock.elapsedRealtime()
    while (startTimes.isNotEmpty() && now - startTimes.first() > START_WINDOW_MS) {
      startTimes.removeFirst()
    }
    return startTimes.size < MAX_STARTS_PER_WINDOW
  }

  @Synchronized
  private fun startInternal() {
    val scanner = requireScanner()
    stopInternal()
    if (!canStartNow()) {
      throw CodedException(
        "BLE_THROTTLED",
        "Android limits how often scanning can start. Wait 30 seconds, then start again.",
        null,
      )
    }
    startTimes.addLast(SystemClock.elapsedRealtime())
    lastResultAt = SystemClock.elapsedRealtime()

    val callback = buildCallback()
    scanCallback = callback
    // No filters: every advertisement in range is reported, exactly like nRF Connect.
    scanner.startScan(null, settingsFor(profile), callback)
  }

  @Synchronized
  private fun stopInternal() {
    val callback = scanCallback ?: return
    scanCallback = null
    try {
      requireScanner().stopScan(callback)
    } catch (error: Exception) {
      emitStatus("Stop scan ignored: ${error.message}")
    }
  }

  private fun restartIfWanted() {
    if (!wantScanning) return
    try {
      startInternal()
      restartCount++
    } catch (error: Exception) {
      wantScanning = false
      emitError(error.message ?: "Could not restart the Bluetooth scan.")
    }
  }

  private fun startWatchdog() {
    mainHandler.removeCallbacks(watchdog)
    mainHandler.postDelayed(watchdog, WATCHDOG_TICK_MS)
  }

  private fun stopWatchdog() {
    mainHandler.removeCallbacks(watchdog)
  }

  private fun buildCallback() = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      emitAdvertisement(result)
    }

    override fun onBatchScanResults(results: MutableList<ScanResult>) {
      results.forEach { emitAdvertisement(it) }
    }

    override fun onScanFailed(errorCode: Int) {
      val canDowngrade =
        (errorCode == ScanCallback.SCAN_FAILED_INTERNAL_ERROR ||
          errorCode == ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED) &&
          profile != ScanProfile.BARE
      if (wantScanning && canDowngrade) {
        profile = if (profile == ScanProfile.LEGACY_AND_EXTENDED) ScanProfile.LOW_LATENCY else ScanProfile.BARE
        emitStatus("Scan settings rejected (code $errorCode). Retrying with ${profile.label}.")
        mainHandler.postDelayed({ restartIfWanted() }, RESTART_DELAY_MS)
        return
      }
      wantScanning = false
      emitError(describeScanFailure(errorCode))
    }
  }

  private fun emitAdvertisement(result: ScanResult) {
    resultCount++
    lastResultAt = SystemClock.elapsedRealtime()
    val record = result.scanRecord
    val connectable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) result.isConnectable else null
    sendEvent(
      "onAdvertisement",
      mapOf(
        "mac" to result.device.address,
        "name" to readDeviceName(result),
        "rssi" to result.rssi,
        "rawHex" to record?.bytes?.let { toHex(it) },
        "isConnectable" to connectable,
      ),
    )
  }

  private fun readDeviceName(result: ScanResult): String? {
    val advertisedName = result.scanRecord?.deviceName
    if (!advertisedName.isNullOrBlank()) return advertisedName
    return try {
      result.device.name
    } catch (error: SecurityException) {
      null
    }
  }

  private fun toHex(bytes: ByteArray): String =
    bytes.joinToString(" ") { byte -> "%02X".format(byte) }

  private fun describeScanFailure(errorCode: Int): String = when (errorCode) {
    ScanCallback.SCAN_FAILED_ALREADY_STARTED -> "Scan is already running."
    ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED ->
      "Bluetooth refused the scan. Turn Bluetooth off and on, then try again."
    ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> "Bluetooth internal error. Turn Bluetooth off and on."
    ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> "This phone does not support this scan mode."
    ScanCallback.SCAN_FAILED_OUT_OF_HARDWARE_RESOURCES -> "Bluetooth hardware is out of scan resources."
    6 -> "Android limits how often scanning can start. Wait 30 seconds, then start again."
    else -> "Bluetooth scan failed (code $errorCode)."
  }

  private fun emitStatus(message: String) {
    sendEvent("onScanStatus", mapOf("message" to message))
  }

  private fun emitError(message: String) {
    sendEvent("onScanError", mapOf("message" to message))
  }
}
