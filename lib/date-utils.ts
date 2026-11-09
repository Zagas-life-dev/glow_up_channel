/**
 * Date utility functions for age validation and date restrictions
 */

/** Minimum age to create an account. Matches the Terms of Service and the backend signup validator. */
export const MIN_SIGNUP_AGE = 13

/**
 * Calculate the maximum date that ensures the user is at least MIN_SIGNUP_AGE years old
 * @returns ISO date string (YYYY-MM-DD) for the maximum allowed date
 */
export function getMaxDateForMinAge(): string {
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - MIN_SIGNUP_AGE, today.getMonth(), today.getDate())
  return maxDate.toISOString().split('T')[0]
}

/**
 * Calculate the minimum date (120 years ago) for reasonable age limits
 * @returns ISO date string (YYYY-MM-DD) for the minimum allowed date
 */
export function getMinDateForReasonableAge(): string {
  const today = new Date()
  const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
  return minDate.toISOString().split('T')[0]
}

/**
 * Calculate age from a date of birth
 * @param dateOfBirth - Date of birth string (YYYY-MM-DD)
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  // Adjust age if birthday hasn't occurred this year
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age
  
  return actualAge
}

/**
 * Check if a date of birth makes the person at least MIN_SIGNUP_AGE years old
 * @param dateOfBirth - Date of birth string (YYYY-MM-DD)
 * @returns true if the person is old enough to sign up
 */
export function isAtLeastMinAge(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) >= MIN_SIGNUP_AGE
}

/**
 * Get date picker props for the signup date-of-birth field
 * @returns Object with min and max date strings for date input
 */
export function getDatePickerPropsForSignup() {
  return {
    min: getMinDateForReasonableAge(),
    max: getMaxDateForMinAge()
  }
}

/**
 * @deprecated Use getMaxDateForMinAge instead
 * Calculate the maximum date that ensures the user is at least 16 years old
 * @returns ISO date string (YYYY-MM-DD) for the maximum allowed date
 */
export function getMaxDateFor16Plus(): string {
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate())
  return maxDate.toISOString().split('T')[0]
}

/**
 * @deprecated Use isAtLeastMinAge instead
 * Check if a date of birth makes the person at least 16 years old
 * @param dateOfBirth - Date of birth string (YYYY-MM-DD)
 * @returns true if the person is at least 16 years old
 */
export function isAtLeast16(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) >= 16
}

/**
 * @deprecated Use getDatePickerPropsForSignup instead
 * Get date picker props for forms that require 16+ age validation
 * @returns Object with min and max date strings for date input
 */
export function getDatePickerPropsFor16Plus() {
  return {
    min: getMinDateForReasonableAge(),
    max: getMaxDateFor16Plus()
  }
}









