process.env.CASSETTE_MODE = process.env.CASSETTE_MODE ?? 'replay';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'test-key';
// Skip firebase-admin auto-init during tests. Tests that need db must mock firebase-admin explicitly.
process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '';
