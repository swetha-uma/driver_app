/** Owner approval push data uses these relatedEntityType values from the backend. */
export function ownerPushTargetFromNotificationContent(content) {
  const data = content?.data || {};
  const entityType = String(data.relatedEntityType || '').trim().toUpperCase();
  const entityId = data.relatedEntityId || data.scholarshipRequestId;
  const requestId = entityId == null ? '' : String(entityId).trim();
  if (!requestId) return null;

  let tab;
  if (entityType === 'LEAVE_REQUEST' || entityType === 'LATE_REASON') tab = 'leave';
  else if (
    entityType === 'EMPLOYEE_SALARY_STRUCTURE'
    || entityType === 'DESIGNATION_SALARY_STRUCTURE'
    || entityType === 'SALARY_ADVANCE'
  ) tab = 'salary';
  else if (
    entityType === 'SCHOLARSHIP_REQUEST'
    || String(data.notificationType || '').toUpperCase() === 'SCHOLARSHIP_REQUEST_SUBMITTED'
  ) tab = 'scholarship';
  else return null;

  return { tab, entityType, requestId };
}
