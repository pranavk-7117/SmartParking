import 'dotenv/config';

/**
 * Shared test configuration and client headers for the test suite.
 */
export const TEST_BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;

export const TEST_HEADERS = {
  ADMIN_WEB: {
    'X-Client-Type': 'admin-web',
    'Content-Type': 'application/json',
  },
  OPERATOR_ANDROID: {
    'X-Client-Type': 'operator-android',
    'Content-Type': 'application/json',
  },
};
