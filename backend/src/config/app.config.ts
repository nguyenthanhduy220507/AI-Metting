export default () => ({
  port: parseInt(process.env.BACKEND_PORT ?? '3333', 10),
  uploadDir: process.env.BACKEND_UPLOAD_DIR ?? 'uploads',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL ?? 'http://localhost:5000',
  callbackToken: process.env.PYTHON_SERVICE_CALLBACK_TOKEN ?? '73755272400664530092426538745578',
  publicCallbackBaseUrl:
    process.env.BACKEND_CALLBACK_BASE_URL ?? 'http://localhost:3333',
});
