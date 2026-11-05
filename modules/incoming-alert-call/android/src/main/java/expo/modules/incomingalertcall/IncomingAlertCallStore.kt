package expo.modules.incomingalertcall

/**
 * Holds the active alert-call payload so the Activity and Module stay in sync.
 */
object IncomingAlertCallStore {
  @Volatile
  var title: String = "Student still on van"

  @Volatile
  var titleTamil: String = ""

  @Volatile
  var body: String = ""

  @Volatile
  var bodyTamil: String = ""

  @Volatile
  var tripId: String = ""

  @Volatile
  var studentId: String = ""

  @Volatile
  var active: Boolean = false

  /** Why: Answer may happen before JS is awake — keep payload until React consumes it. */
  @Volatile
  var pendingAnswered: Map<String, String>? = null

  fun put(
    title: String?,
    titleTamil: String?,
    body: String?,
    bodyTamil: String?,
    tripId: String?,
    studentId: String?,
  ) {
    this.title = title?.ifBlank { "Student still on van" } ?: "Student still on van"
    this.titleTamil = titleTamil.orEmpty()
    this.body = body.orEmpty()
    this.bodyTamil = bodyTamil.orEmpty()
    this.tripId = tripId.orEmpty()
    this.studentId = studentId.orEmpty()
    this.active = true
    this.pendingAnswered = null
  }

  fun clear() {
    active = false
  }

  fun toMap(): Map<String, String> = mapOf(
    "title" to title,
    "titleTamil" to titleTamil,
    "body" to body,
    "bodyTamil" to bodyTamil,
    "tripId" to tripId,
    "studentId" to studentId,
  )

  fun rememberAnswered(payload: Map<String, String>) {
    pendingAnswered = payload
  }

  fun consumePendingAnswered(): Map<String, String>? {
    val next = pendingAnswered
    pendingAnswered = null
    return next
  }
}
