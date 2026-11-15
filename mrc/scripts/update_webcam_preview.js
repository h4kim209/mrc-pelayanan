const fs = require('fs');
const path = require('path');

const webcamPath = path.join(__dirname, '..', 'components', 'ui', 'webcam-capture.tsx');
let webcam = fs.readFileSync(webcamPath, 'utf-8');

// 1. Initial photo url helper
webcam = webcam.replace(
  'const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl);',
  'const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ? initialPhotoUrl.replace("/uploads/captures/", "/api/captures/") : null);'
);

// 2. Set preview immediately in capturePhoto
webcam = webcam.replace(
  `    // Stop camera stream once captured
    stopStream();

    // Upload immediately
    uploadImage(dataUrl);`,
  `    // Show preview immediately with local data URL
    setPhotoPreview(dataUrl);

    // Stop camera stream once captured
    stopStream();

    // Upload to server
    uploadImage(dataUrl);`
);

// 3. In uploadImage
webcam = webcam.replace(
  `      setPhotoPreview(data.path);
      onPhotoCaptured(data.path);`,
  `      // Keep local preview if already set, but save server path
      if (!photoPreview) setPhotoPreview(data.path);
      onPhotoCaptured(data.path);`
);

fs.writeFileSync(webcamPath, webcam, 'utf-8');
console.log('webcam-capture.tsx updated with instant preview');
