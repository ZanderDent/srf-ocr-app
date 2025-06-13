# SRF OCR Tool Mobile App

A cross-platform mobile application for Optical Character Recognition (OCR) built with React (Ionic + Capacitor) for the frontend and Flask for the backend. The app allows users to capture or select images, extract text using OCR, and export results in CSV, Excel, or Word formats. Designed for both iOS and Android, with mobile-specific deployment and usage notes.

---

**DEMO VIDEO:**  
[![Watch the demo](https://i.ytimg.com/vi/ScAFJ0KLNjk/oar2.jpg?sqp=-oaymwEoCMwCENAFSFqQAgHyq4qpAxcIARUAAIhC2AEB4gEKCBgQAhgGOAFAAQ==&rs=AOn4CLAJb5jFLQJ4jhsYwReeyqL55a0a-w)](https://youtube.com/shorts/ScAFJ0KLNjk)

## Repository Structure

```
OCR-app/
├── README.md
├── backend/                # Flask backend (OCR API)
│   ├── app.py
│   └── requirements.txt
└── srf-ocr/                # React + Capacitor frontend (mobile app)
    ├── src/
    ├── public/
    ├── ios/                # iOS native project (Capacitor)
    ├── android/            # Android native project (Capacitor)
    └── ...
```

---

## Backend Setup (Flask)

### 1. Prerequisites
- Python 3.8+
- pip

### 2. Installation
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Running the Backend
```bash
export FLASK_APP=app.py
export FLASK_ENV=development  # Optional: enables debug mode
flask run --host=0.0.0.0 --port=5000
```
- The backend will be available at `http://localhost:5000` by default.
- For mobile device access, ensure your computer and device are on the same network. Use your computer's local IP address in the frontend config.

### 4. Environment Variables
- You can set additional environment variables as needed (e.g., for OCR language packs).

---

## Frontend Setup (React + Capacitor)

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- [Ionic CLI](https://ionicframework.com/docs/cli) (optional, for development)
- [Capacitor CLI](https://capacitorjs.com/docs/getting-started)
- Xcode (for iOS builds)
- Android Studio (for Android builds)

### 2. Installation
```bash
cd srf-ocr
npm install
```

### 3. Configure Backend API URL
- Create a `.env` file in `srf-ocr/`:
  ```env
  VITE_API_URL=http://<YOUR_BACKEND_IP>:5000
  ```
- Replace `<YOUR_BACKEND_IP>` with your computer's IP address if running on a device.

### 4. Running in Browser (for development)
```bash
npm run dev
```
- The app will be available at `http://localhost:5173` (or similar).
- Note: Some mobile features (camera, file system, sharing) may not work in the browser.

### 5. Running on Mobile Devices

#### iOS
```bash
npx cap sync ios
npx cap open ios
```
- Open in Xcode, select your device/simulator, and run.
- For device testing, ensure the backend is accessible from your phone (use local IP, not localhost).
- If you encounter CORS issues, check backend Flask CORS settings.

#### Android
```bash
npx cap sync android
npx cap open android
```
- Open in Android Studio, select your device/emulator, and run.
- Same network and CORS notes as iOS.

### 6. Building for Production
```bash
npm run build
npx cap sync
```
- Then open the native project in Xcode/Android Studio as above.

---

## Export & File Sharing (Mobile)
- Exported files (CSV, Excel, Word) are saved to the app's sandboxed file system.
- On iOS, files are shared using the system share sheet. If you do not see the file in the Files app, use the share option to send/export it.
- On Android, files can be shared or accessed via the app's file system or share sheet.
- If you encounter encoding or file access issues, ensure you have the latest Capacitor plugins and permissions set in your native project.

---

## Troubleshooting

- **Backend not reachable from device:**
  - Ensure both computer and device are on the same WiFi network.
  - Use your computer's IP address, not `localhost` or `127.0.0.1`, in the frontend `.env`.
  - Check firewall settings.

- **CORS errors:**
  - Ensure Flask backend has CORS enabled (e.g., using `flask-cors`).

- **Exported files not visible:**
  - On iOS, use the share sheet to export files to other apps (e.g., Files, Mail).
  - On Android, check app permissions and use the share option.

- **Camera or file access issues:**
  - Ensure you have granted camera and file permissions in the app settings.
  - Check Capacitor plugin installation and configuration.

- **iOS-specific:**
  - If you see a white screen or app fails to load, try cleaning the build folder in Xcode and rebuilding.
  - Make sure all required permissions are set in `Info.plist`.
