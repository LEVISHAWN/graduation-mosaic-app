import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, MessageSquare, Clock, Mail, ImagePlus, Lock, Unlock, Sparkles, Grid, Zap } from 'lucide-react';

// The following component preserves the full original logic you provided
// while adding optional backend integration: it will try backend endpoints
// (if a Flask dev server is running at the same origin) and fall back to
// the original client-side/local-storage behaviour if the backend is absent.
const GraduationApp = () => {
  const [activeTab, setActiveTab] = useState('capsule');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [graduateEmail, setGraduateEmail] = useState('');
  const [mosaicImages, setMosaicImages] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [mosaicGenerated, setMosaicGenerated] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mosaicStyle, setMosaicStyle] = useState('mixed');
  const [gridSize, setGridSize] = useState(15);
  const [opacity, setOpacity] = useState(0.3);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const loadedImages = useRef([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Try backend first
    try {
      const resp = await fetch('/api/messages');
      if (resp.ok) {
        const data = await resp.json();
        setMessages(data || []);
      }

      const sresp = await fetch('/api/settings');
      if (sresp.ok) {
        const settings = await sresp.json();
        setUnlockDate(settings.unlock_date || '');
        setGraduateEmail(settings.graduate_email || '');
        checkUnlockStatus(settings.unlock_date);
      }
      return;
    } catch (e) {
      // backend not available, fallback to window.storage/local behavior
    }

    try {
      const msgsResult = await window.storage?.get('graduation_messages');
      const settingsResult = await window.storage?.get('graduation_settings');
      
      if (msgsResult) {
        const data = JSON.parse(msgsResult.value);
        setMessages(data);
      }
      
      if (settingsResult) {
        const settings = JSON.parse(settingsResult.value);
        setUnlockDate(settings.unlockDate || '');
        setGraduateEmail(settings.unlockEmail || '');
        checkUnlockStatus(settings.unlockDate);
      }
    } catch (error) {
      console.log('No previous data found');
    }
  };

  const checkUnlockStatus = (date) => {
    if (date) {
      const unlock = new Date(date);
      const now = new Date();
      setIsLocked(now < unlock);
    }
  };

  const saveMessage = async () => {
    if (newMessage.trim() && guestName.trim()) {
      const encryptedMsg = btoa(newMessage);
      const msg = {
        id: Date.now(),
        guest: guestName,
        message: encryptedMsg,
        preview: newMessage.substring(0, 20) + (newMessage.length > 20 ? '...' : ''),
        timestamp: new Date().toISOString()
      };
      
      const updatedMessages = [...messages, msg];
      setMessages(updatedMessages);
      
      try {
        // Try backend save
        const resp = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg)
        });

        // Also save settings
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unlock_date: unlockDate, graduate_email: graduateEmail })
        });

        // If backend fails, fallback to window.storage
        if (!resp.ok) throw new Error('backend save failed');

        setNewMessage('');
        setGuestName('');
        alert('Message saved to time capsule! 🎉');
      } catch (error) {
        // Fallback to original behaviour (window.storage)
        try {
          await window.storage?.set('graduation_messages', JSON.stringify(updatedMessages));
          const settings = { unlockDate, graduateEmail };
          await window.storage?.set('graduation_settings', JSON.stringify(settings));
          setNewMessage('');
          setGuestName('');
          alert('Message saved locally to time capsule! 🎉');
        } catch (err) {
          alert('Error saving message. Please try again.');
        }
      }
    } else {
      alert('Please enter both your name and message!');
    }
  };

  const unlockMessages = () => {
    const unlock = new Date(unlockDate);
    const now = new Date();
    
    if (now >= unlock || !unlockDate) {
      setIsLocked(false);
      if (graduateEmail) {
        // Try backend email send
        fetch('/api/send-unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graduate_email: graduateEmail, app_url: window.location.href })
        }).catch(() => {
          // If backend not available, call client-side alert fallback
          sendUnlockEmail();
        });
      }
    } else {
      alert(`Time capsule locked until ${unlock.toLocaleDateString()}!`);
    }
  };

  const sendUnlockEmail = () => {
    const subject = '🎓 Your Graduation Time Capsule is Ready!';
    const body = `Dear Graduate,\n\nYour time capsule from ${new Date().toLocaleDateString()} is now unlocked! ${messages.length} messages from your loved ones are waiting for you.\n\nClick to view: ${window.location.href}\n\nCongratulations on this milestone!`;
    
    alert(`📧 Email notification sent to: ${graduateEmail}\n\n"${subject}"\n\nThe graduate will receive periodic reminders until they view all messages.`);
  };

  // Faster image decoding using createImageBitmap when available.
  const preloadImages = async (imageSrcs) => {
    const results = [];
    const sampleSize = 8; // small sample for average color

    for (const src of imageSrcs) {
      try {
        let drawable = null;
        if (typeof createImageBitmap === 'function') {
          const res = await fetch(src);
          const blob = await res.blob();
          try {
            drawable = await createImageBitmap(blob);
          } catch (e) {
            // fallback to Image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((r, rej) => { img.onload = r; img.onerror = rej; img.src = src; });
            drawable = img;
          }
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((r, rej) => { img.onload = r; img.onerror = rej; img.src = src; });
          drawable = img;
        }

        // compute small-average color once and cache it
        const avg = getAverageColorSmall(drawable, sampleSize, sampleSize);
        results.push({ img: drawable, avg });
      } catch (err) {
        console.warn('Failed to preload image', src, err);
      }
    }
    return results;
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      });
    });

    const images = await Promise.all(imagePromises);
    setMosaicImages(prev => [...prev, ...images]);

    // Try sending to backend (optional) for server-side mosaic generation later
    try {
      const form = new FormData();
      files.forEach((f) => form.append('photos', f));
      await fetch('/api/upload', { method: 'POST', body: form });
    } catch (err) {
      // ignore if backend not available
    }
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target.result);
      };
      reader.readAsDataURL(file);

      // attempt upload to backend also
      try {
        const form = new FormData();
        form.append('background', file);
        fetch('/api/upload-background', { method: 'POST', body: form }).catch(() => {});
      } catch (err) {}
    }
  };

  const getAverageColor = (img, sx, sy, sw, sh) => {
    // keep this generic but prefer fast small-sample helper if possible
    return getAverageColorSmall(img, sw, sh, sx, sy);
  };

  // Fast small-sample average color. If img is ImageBitmap or Image it works.
  const getAverageColorSmall = (img, sampleW = 4, sampleH = 4, sx = 0, sy = 0) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');

      // draw the relevant region scaled down to sample size
      // if img has width/height use that, else draw full
      const iw = img.width || sampleW;
      const ih = img.height || sampleH;
      ctx.drawImage(img, sx, sy, Math.max(1, sampleW), Math.max(1, sampleH), 0, 0, sampleW, sampleH);
      const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
      let r = 0, g = 0, b = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      return { r: Math.round(r / pixels), g: Math.round(g / pixels), b: Math.round(b / pixels) };
    } catch (e) {
      return { r: 128, g: 128, b: 128 };
    }
  };

  const findBestMatchImage = (targetColor, images) => {
    // images is expected to be array of {img, avg}
    let best = images[0];
    let minDiff = Infinity;
    for (const item of images) {
      const avg = item.avg || (item.img && getAverageColorSmall(item.img, 4, 4));
      const diff = Math.abs(targetColor.r - avg.r) + Math.abs(targetColor.g - avg.g) + Math.abs(targetColor.b - avg.b);
      if (diff < minDiff) {
        minDiff = diff;
        best = item.img;
      }
    }
    return best;
  };

  const generateMosaic = async () => {
    // If backend is available, prefer server-side mosaic generation (faster and avoids heavy client CPU)
    try {
      setGenerating(true);
      const resp = await fetch('/api/generate-mosaic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grid_size: gridSize }) });
      if (resp.ok) {
        const { mosaic_data_url } = await resp.json();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          setMosaicGenerated(true);
          setGenerating(false);
        };
        img.src = mosaic_data_url;
        return;
      }
    } catch (e) {
      // backend not reachable — fallback to client-side generation (original code)
    }

    if (mosaicImages.length < 10) {
      alert('Please upload at least 10 images for a better mosaic!');
      setGenerating(false);
      return;
    }

    setGenerating(true);
    setMosaicGenerated(false);

    try {
      // Cap canvas size by device (improves performance on smaller screens)
      const maxDim = 1400; // reasonable upper bound for quality vs performance
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const targetSize = Math.min(maxDim, 1600);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Preload and decode images as ImageBitmap where possible
      loadedImages.current = await preloadImages(mosaicImages);

      // Use scaled canvas dimensions for a balance of speed and quality
      canvas.width = targetSize * dpr;
      canvas.height = targetSize * dpr;
      canvas.style.width = `${targetSize}px`;
      canvas.style.height = `${targetSize}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (backgroundImage) {
        // draw background using ImageBitmap for speed
        let bgBitmap;
        try {
          const res = await fetch(backgroundImage);
          const blob = await res.blob();
          bgBitmap = await createImageBitmap(blob);
        } catch (e) {
          // fallback to Image
          const bgImg = new Image();
          await new Promise((resolve) => { bgImg.onload = resolve; bgImg.src = backgroundImage; });
          ctx.drawImage(bgImg, 0, 0, targetSize, targetSize);
          ctx.fillStyle = `rgba(255,255,255,${opacity})`;
          ctx.fillRect(0,0,targetSize,targetSize);
          await drawOptimizedMosaic(ctx, targetSize, targetSize, bgImg);
          setMosaicGenerated(true);
          return;
        }

        if (bgBitmap) {
          ctx.drawImage(bgBitmap, 0, 0, targetSize, targetSize);
          ctx.fillStyle = `rgba(255,255,255,${opacity})`;
          ctx.fillRect(0,0,targetSize,targetSize);
          await drawOptimizedMosaic(ctx, targetSize, targetSize, bgBitmap);
        }
      } else {
        const gradient = ctx.createLinearGradient(0, 0, targetSize, targetSize);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, targetSize, targetSize);

        await drawOptimizedMosaic(ctx, targetSize, targetSize, null);
      }

      setMosaicGenerated(true);
    } catch (error) {
      alert('Error generating mosaic. Please try again.');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const drawOptimizedMosaic = async (ctx, width, height, bgImg) => {
    const tileSize = Math.floor(width / gridSize);
    const cols = gridSize;
    const rows = gridSize;
    
    // Batch render tiles
    const tiles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tiles.push({ row, col });
      }
    }
    
    // Process in frames using requestAnimationFrame for smoother UI
    const chunkSize = Math.max(8, Math.floor((tiles.length) / 60)); // aim ~60 frames
    for (let i = 0; i < tiles.length; i += chunkSize) {
      const chunk = tiles.slice(i, i + chunkSize);

      for (const { row, col } of chunk) {
        const x = col * tileSize;
        const y = row * tileSize;

        let tileDrawable;
        if (bgImg && mosaicStyle === 'smart') {
          // sample small area from bgImg to compute target color
          const sampleW = Math.max(2, Math.floor(tileSize * (bgImg.width || width) / width));
          const sampleH = Math.max(2, Math.floor(tileSize * (bgImg.height || height) / height));
          const sampleX = Math.floor((x * (bgImg.width || width)) / width);
          const sampleY = Math.floor((y * (bgImg.height || height)) / height);
          const targetColor = getAverageColorSmall(bgImg, 4, 4, sampleX, sampleY);
          tileDrawable = findBestMatchImage(targetColor, loadedImages.current);
        } else {
          const rand = Math.floor(Math.random() * loadedImages.current.length);
          tileDrawable = loadedImages.current[rand].img || loadedImages.current[rand];
        }

        // draw tile; if tileDrawable is ImageBitmap it's fast
        ctx.save();
        ctx.beginPath();

        const shapeType = mosaicStyle === 'circles' ? 'circle' : mosaicStyle === 'squares' ? 'square' : Math.random();
        if (shapeType === 'circle' || shapeType > 0.7) {
          ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 1, 0, Math.PI * 2);
        } else if (shapeType === 'square' || shapeType > 0.4) {
          const radius = tileSize * 0.15;
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + tileSize - radius, y);
          ctx.quadraticCurveTo(x + tileSize, y, x + tileSize, y + radius);
          ctx.lineTo(x + tileSize, y + tileSize - radius);
          ctx.quadraticCurveTo(x + tileSize, y + tileSize, x + tileSize - radius, y + tileSize);
          ctx.lineTo(x + radius, y + tileSize);
          ctx.quadraticCurveTo(x, y + tileSize, x, y + tileSize - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
        } else {
          ctx.rect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }

        ctx.clip();
        try {
          if (tileDrawable) ctx.drawImage(tileDrawable, x, y, tileSize, tileSize);
        } catch (e) {
          // ignore draw errors per tile
        }
        ctx.restore();
      }

      // yield to browser for next frame
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  };

  const downloadMosaic = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'graduation_memory_mosaic.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const clearMosaicImages = () => {
    if (confirm('Clear all uploaded photos?')) {
      setMosaicImages([]);
      setMosaicGenerated(false);
      loadedImages.current = [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            🎓 Graduation Memory Keeper
          </h1>
          <p className="text-white text-lg opacity-90">
            Digital Time Capsule & Memory Mosaic Generator
          </p>
        </header>

        <div className="flex gap-4 mb-6 justify-center flex-wrap">
          <button
            onClick={() => setActiveTab('capsule')}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition ${
              activeTab === 'capsule'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <MessageSquare size={20} />
            Time Capsule
          </button>
          <button
            onClick={() => setActiveTab('mosaic')}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition ${
              activeTab === 'mosaic'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Camera size={20} />
            Memory Mosaic
          </button>
        </div>

        {activeTab === 'capsule' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Lock size={28} className="text-purple-600" />
                Digital Time Capsule
              </h2>
              <p className="text-gray-600 mb-6">
                Leave a message for the graduate to read in the future. Messages are encrypted and show only a 20-character preview until unlock date.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-purple-50 rounded-lg">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Clock size={16} />
                    Unlock Date
                  </label>
                  <input
                    type="date"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Mail size={16} />
                    Graduate's Email (Required)
                  </label>
                  <input
                    type="email"
                    value={graduateEmail}
                    onChange={(e) => setGraduateEmail(e.target.value)}
                    placeholder="graduate@email.com"
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <textarea
                  placeholder="Write your message to the future graduate..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                />
                <button
                  onClick={saveMessage}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Add to Time Capsule 🎁
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  Message Archive ({messages.length})
                </h3>
                {isLocked && (
                  <button
                    onClick={unlockMessages}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition flex items-center gap-2"
                  >
                    <Unlock size={18} />
                    Unlock Now
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages yet. Be the first to leave one!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-purple-700">{msg.guest}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {isLocked ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Lock size={16} />
                          <span className="italic">{msg.preview}</span>
                        </div>
                      ) : (
                        <p className="text-gray-700">{atob(msg.message)}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mosaic' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles size={28} className="text-purple-600" />
              Optimized Memory Mosaic
            </h2>
            <p className="text-gray-600 mb-6">
              Upload photos to create a stunning artistic mosaic with intelligent color matching!
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-6 border-2 border-dashed border-purple-300 rounded-lg">
                <input
                  type="file"
                  ref={bgInputRef}
                  onChange={handleBackgroundUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => bgInputRef.current.click()}
                  className="w-full mb-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
                >
                  <ImagePlus className="inline mr-2" size={20} />
                  Upload Background
                </button>
                <p className="text-sm text-gray-600 text-center">Graduate's photo or logo</p>
                {backgroundImage && (
                  <img src={backgroundImage} alt="Background" className="mt-4 max-h-32 mx-auto rounded shadow" />
                )}
              </div>

              <div className="p-6 border-2 border-dashed border-purple-300 rounded-lg">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="w-full mb-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
                >
                  <Upload className="inline mr-2" size={20} />
                  Upload Photos ({mosaicImages.length})
                </button>
                <p className="text-sm text-gray-600 text-center mb-2">Min 10 photos</p>
                {mosaicImages.length > 0 && (
                  <button
                    onClick={clearMosaicImages}
                    className="w-full px-4 py-2 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg mb-6 space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Grid size={20} />
                Mosaic Settings
              </h3>
              
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Style
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'mixed', label: '🎨 Mixed' },
                    { value: 'circles', label: '⭕ Circles' },
                    { value: 'squares', label: '⬜ Squares' },
                    { value: 'smart', label: '🧠 Smart Match' }
                  ].map(style => (
                    <button
                      key={style.value}
                      onClick={() => setMosaicStyle(style.value)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        mosaicStyle === style.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                {mosaicStyle === 'smart' && (
                  <p className="text-xs text-purple-600 mt-2">
                    ⚡ Smart Match uses AI to match photo colors with background
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Grid Density: {gridSize}x{gridSize} ({gridSize * gridSize} tiles)
                </label>
                <input
                  type="range"
                  min="10"
                  max="25"
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Background Opacity: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.7"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={generateMosaic}
              disabled={mosaicImages.length < 1 || generating}
              className="w-full mb-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-bold text-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>⏳ Generating Amazing Mosaic...</>
              ) : (
                <>
                  <Zap size={24} />
                  Generate High-Quality Mosaic
                </>
              )}
            </button>

            <div className="text-center">
              <canvas
                ref={canvasRef}
                className="max-w-full border-4 border-purple-300 rounded-lg shadow-2xl mx-auto"
                style={{ display: mosaicGenerated ? 'block' : 'none' }}
              />
              {mosaicGenerated && (
                <div className="mt-4 space-x-4">
                  <button
                    onClick={downloadMosaic}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
                  >
                    💾 Download High-Res Mosaic
                  </button>
                  <button
                    onClick={() => setMosaicGenerated(false)}
                    className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    🔄 Generate New
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-white opacity-75">
          <p className="text-sm">
            Share this link with party guests • Works on all devices 📱💻
          </p>
        </footer>
      </div>
    </div>
  );
};

export default GraduationApp;
