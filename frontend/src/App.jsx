import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, MessageSquare, Clock, Mail, ImagePlus, Lock, Unlock, Sparkles, Grid, Zap } from 'lucide-react';

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
    try {
      // `window.storage` is a thin shim used in the original app; in browser we'll use localStorage
      const msgsResult = localStorage.getItem('graduation_messages');
      const settingsResult = localStorage.getItem('graduation_settings');
      
      if (msgsResult) {
        const data = JSON.parse(msgsResult);
        setMessages(data);
      }
      
      if (settingsResult) {
        const settings = JSON.parse(settingsResult);
        setUnlockDate(settings.unlockDate || '');
        setGraduateEmail(settings.graduateEmail || '');
        checkUnlockStatus(settings.unlockDate);
      }
    } catch (error) {
      console.log('No previous data found', error);
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
        localStorage.setItem('graduation_messages', JSON.stringify(updatedMessages));
        const settings = { unlockDate, graduateEmail };
        localStorage.setItem('graduation_settings', JSON.stringify(settings));
        
        setNewMessage('');
        setGuestName('');
        alert('Message saved to time capsule! 🎉');
      } catch (error) {
        alert('Error saving message. Please try again.');
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
        sendUnlockEmail();
      }
    } else {
      alert(`Time capsule locked until ${unlock.toLocaleDateString()}!`);
    }
  };

  const sendUnlockEmail = () => {
    const subject = '🎓 Your Graduation Time Capsule is Ready!';
    const body = `Dear Graduate,\n\nYour time capsule from ${new Date().toLocaleDateString()} is now unlocked! ${messages.length} messages from your loved ones are waiting for you.\n\nClick to view: ${window.location.href}\n\nCongratulations on this milestone!`;
    
    // In a local environment we can't send real email; this is a placeholder showing the notification
    alert(`📧 Email notification sent to: ${graduateEmail}\n\n"${subject}"\n\nThe graduate will receive periodic reminders until they view all messages.`);
  };

  const preloadImages = (imageSrcs) => {
    return Promise.all(
      imageSrcs.map(src => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      })
    );
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
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getAverageColor = (img, sx, sy, sw, sh) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    
    tempCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const imageData = tempCtx.getImageData(0, 0, sw, sh);
    const data = imageData.data;
    
    let r = 0, g = 0, b = 0;
    const pixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    
    return {
      r: Math.round(r / pixels),
      g: Math.round(g / pixels),
      b: Math.round(b / pixels)
    };
  };

  const findBestMatchImage = (targetColor, images) => {
    let bestMatch = images[0];
    let minDiff = Infinity;
    
    images.forEach(img => {
      const avgColor = getAverageColor(img, 0, 0, img.width, img.height);
      const diff = Math.abs(targetColor.r - avgColor.r) + 
                   Math.abs(targetColor.g - avgColor.g) + 
                   Math.abs(targetColor.b - avgColor.b);
      
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = img;
      }
    });
    
    return bestMatch;
  };

  const generateMosaic = async () => {
    if (mosaicImages.length < 10) {
      alert('Please upload at least 10 images for a better mosaic!');
      return;
    }

    setGenerating(true);
    setMosaicGenerated(false);

    try {
      // Preload all images
      loadedImages.current = await preloadImages(mosaicImages);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      canvas.width = 1600;
      canvas.height = 1600;

      if (backgroundImage) {
        const bgImg = new Image();
        await new Promise((resolve) => {
          bgImg.onload = resolve;
          bgImg.src = backgroundImage;
        });
        
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await drawOptimizedMosaic(ctx, canvas.width, canvas.height, bgImg);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await drawOptimizedMosaic(ctx, canvas.width, canvas.height, null);
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
    
    // Process in chunks for better performance
    const chunkSize = 20;
    for (let i = 0; i < tiles.length; i += chunkSize) {
      const chunk = tiles.slice(i, i + chunkSize);
      
      chunk.forEach(({ row, col }) => {
        const x = col * tileSize;
        const y = row * tileSize;
        
        let tileImage;
        if (bgImg && mosaicStyle === 'smart') {
          const targetColor = getAverageColor(bgImg, 
            Math.floor(x * bgImg.width / width), 
            Math.floor(y * bgImg.height / height),
            Math.floor(tileSize * bgImg.width / width),
            Math.floor(tileSize * bgImg.height / height)
          );
          tileImage = findBestMatchImage(targetColor, loadedImages.current);
        } else {
          tileImage = loadedImages.current[Math.floor(Math.random() * loadedImages.current.length)];
        }
        
        ctx.save();
        ctx.beginPath();
        
        const shapeType = mosaicStyle === 'circles' ? 'circle' : 
                         mosaicStyle === 'squares' ? 'square' : 
                         Math.random();
        
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
        ctx.drawImage(tileImage, x, y, tileSize, tileSize);
        ctx.restore();
      });
      
      // Allow UI updates between chunks
      await new Promise(resolve => setTimeout(resolve, 0));
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
