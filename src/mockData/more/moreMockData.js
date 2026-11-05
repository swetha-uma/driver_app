/** Mock driver profile and More menu — replace with API later. */
export const moreMockData = {
  title: 'My Profile',
  driver: {
    id: 'driver-ravi',
    name: 'Ravi Kumar',
    role: 'Driver',
    phone: '9876543210',
    email: 'ravi.kumar@schoolerp.demo',
    experience: '8 years',
    employeeId: 'EMP-DRV-1042',
    licenseNumber: 'TN-09-2020-004512',
    vehicleAssigned: 'School Bus A · KA-01-AB-1234',
  },
  menuItems: [
    { id: 'details', label: 'Driver details', icon: 'person', tone: 'purple' },
    { id: 'server', label: 'Server', icon: 'settings', tone: 'slate' },
    { id: 'logout', label: 'Log out', icon: 'log-out', tone: 'error' },
  ],
  driverDetails: [
    { label: 'Full name', value: 'Ravi Kumar' },
    { label: 'Role', value: 'Driver' },
    { label: 'Phone', value: '+91 98765 43210' },
    { label: 'Email', value: 'ravi.kumar@schoolerp.demo' },
    { label: 'Experience', value: '8 years' },
    { label: 'Employee ID', value: 'EMP-DRV-1042' },
    { label: 'License number', value: 'TN-09-2020-004512' },
    { label: 'Vehicle assigned', value: 'School Bus A · KA-01-AB-1234' },
  ],
};

/**
 * Resolve mock driver profile for a logged-in phone.
 * Design build: any verified phone maps to the same demo driver, with phone overridden.
 */
export function getDriverProfileForPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const base = moreMockData.driver;
  const displayPhone = digits.length === 10
    ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    : base.phone;

  return {
    ...base,
    phone: digits || base.phone,
    phoneDisplay: displayPhone,
  };
}

export function getDriverDetailRows(driver) {
  return [
    { label: 'Full name', value: driver.name },
    { label: 'Role', value: driver.role },
    { label: 'Phone', value: driver.phoneDisplay || driver.phone },
    { label: 'Email', value: driver.email },
    { label: 'Experience', value: driver.experience },
    { label: 'Employee ID', value: driver.employeeId },
    { label: 'License number', value: driver.licenseNumber },
    { label: 'Vehicle assigned', value: driver.vehicleAssigned },
  ];
}
