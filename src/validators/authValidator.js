const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BD_PHONE_REGEX = /^(?:\+?88)?01[3-9]\d{8}$/;

function validateRegistrationInput(body) {
  const errors = [];
  const {
    full_name,
    email,
    phone,
    password,
    confirm_password,
    role,
    agency_name,
    base_service_fee_bdt,
    max_group_capacity
  } = body;

  if (!full_name || full_name.trim().length < 3) {
    errors.push('Full name must be at least 3 characters long.');
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    errors.push('Please provide a valid email address.');
  }

  if (!phone || !BD_PHONE_REGEX.test(phone.trim().replace(/[\s-]/g, ''))) {
    errors.push('Please provide a valid Bangladeshi mobile number (e.g., 017XXXXXXXX).');
  }

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (password !== confirm_password) {
    errors.push('Passwords do not match.');
  }

  const selectedRole = role === 'agent' ? 'agent' : 'tourist';

  if (selectedRole === 'agent') {
    if (!agency_name || agency_name.trim().length < 3) {
      errors.push('Agency or Tour Operator name is required for Tour Agents.');
    }
    const fee = Number(base_service_fee_bdt);
    if (Number.isNaN(fee) || fee < 0) {
      errors.push('Agent base service fee must be a valid non-negative amount in BDT.');
    }
    const capacity = Number(max_group_capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
      errors.push('Maximum group capacity must be between 1 and 200 travelers.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedRole: selectedRole
  };
}

function validateLoginInput(body) {
  const errors = [];
  const { email, password } = body;

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    errors.push('Please enter a valid email address.');
  }
  if (!password || password.trim().length === 0) {
    errors.push('Please enter your password.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateRegistrationInput,
  validateLoginInput
};
