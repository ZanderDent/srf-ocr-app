# SRF OCR Tool Mobile App (Local Dev Only)

> **Important:** This app only works for local development. There is **no live or public backend**—the Flask backend must be running on your computer. The app cannot function unless your computer is on and running the backend server. Your phone and computer must be on the same Wi-Fi network, and the frontend must point to your computer’s LAN IP address (see **Configure Backend API URL** below).

> **Export Limitation:** On mobile devices, exported files (CSV, Excel, Word) are currently saved or shared as plain text files (e.g., `.txt`) instead of the intended format. This is a known limitation due to mobile file handling and MIME type support. You will need to manually rename the file extension to `.csv`, `.xlsx`, or `.docx` after exporting for proper use.

> **Handwriting OCR:** The included OCR engines work well for printed text but are not reliable for handwriting. For better handwritten transcription, consider a commercial solution like [Handwriting OCR](https://www.handwritingocr.com/).

---

**DEMO VIDEO:**  
[![Watch the demo](https://i.ytimg.com/vi/ScAFJ0KLNjk/oar2.jpg)](https://youtube.com/shorts/ScAFJ0KLNjk)

A cross-platform mobile application for Optical Character Recognition (OCR) built with React (Ionic + Capacitor) for the frontend and Flask for the backend. The app allows users to capture or select images, extract text using OCR, and export results in CSV, Excel, or Word formats. **Note:** Exported files on mobile devices may not save with the correct format/extension (see above).

---

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
  VITE_API_URL=http://<YOUR_COMPUTER_IP>:5000
  ```
- Replace `<YOUR_COMPUTER_IP>` with your computer's LAN IP address.

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
- **Known Issue:** On mobile devices, exported files (CSV, Excel, Word) are saved or shared as plain text files (e.g., `.txt`) instead of the intended format. This is due to current limitations with file handling and MIME type support in the mobile environment.
- **Workaround:** After exporting, you must manually rename the file extension to `.csv`, `.xlsx`, or `.docx` for proper use.
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

- **Exported files not visible or wrong format:**
  - On iOS, use the share sheet to export files to other apps (e.g., Files, Mail).
  - On Android, check app permissions and use the share option.
  - If the file is saved as `.txt`, manually rename it to the correct extension on your computer.

- **Camera or file access issues:**
  - Ensure you have granted camera and file permissions in the app settings.
  - Check Capacitor plugin installation and configuration.

- **iOS-specific:**
  - If you see a white screen or app fails to load, try cleaning the build folder in Xcode and rebuilding.
  - Make sure all required permissions are set in `Info.plist`.

---

This README reflects the current local-only status and known mobile export limitations. For questions or updates, please open an issue or contact the maintainer.
