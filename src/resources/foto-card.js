export class FotoCard {
  static async drawSticker(canvas, sticker, teamName, flagSvgUrl, crestSvgUrl) {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // If the image is the AI-generated complete card, draw it to fill the entire canvas proportionally
    if (sticker.userPhotoUrl && sticker.userPhotoUrl.startsWith('data:image')) {
      const aiCardImg = new Image();
      aiCardImg.src = sticker.userPhotoUrl;
      await new Promise((resolve) => {
        aiCardImg.onload = () => {
          // Clean background
          ctx.fillStyle = '#0d0f14';
          ctx.fillRect(0, 0, w, h);
          
          // Calculate aspect ratios
          const imgRatio = aiCardImg.width / aiCardImg.height;
          const canvasRatio = w / h;
          let dx = 0, dy = 0, dw = w, dh = h;
          
          if (imgRatio > canvasRatio) {
            // Image is wider, scale based on width
            dw = w;
            dh = w / imgRatio;
            dy = (h - dh) / 2;
          } else {
            // Image is taller, scale based on height
            dh = h;
            dw = h * imgRatio;
            dx = (w - dw) / 2;
          }
          
          ctx.drawImage(aiCardImg, dx, dy, dw, dh);
          resolve();
        };
        aiCardImg.onerror = resolve;
      });
      return;
    }

    // Load the base template card image from resources
    const templateImg = new Image();
    templateImg.src = 'resources/foto-card.png';

    await new Promise((resolve) => {
      templateImg.onload = () => {
        ctx.drawImage(templateImg, 0, 0, w, h);
        resolve();
      };
      templateImg.onerror = () => {
        // Fallback gradient if base template image fails to load
        console.warn("Base card template 'resources/foto-card.png' could not be loaded. Using gradient fallback.");
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#1a1f2c');
        gradient.addColorStop(1, '#0d0f14');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        resolve();
      };
    });

    // Draw User Photo
    if (sticker.userPhotoUrl) {
      const userImg = new Image();
      userImg.src = sticker.userPhotoUrl;
      await new Promise((resolve) => {
        userImg.onload = () => {
          // Centered avatar-style photo placement
          const frameX = 90;
          const frameY = 70;
          const frameSize = w - 180; // 300x300 px frame (centered on 480px width)
          
          ctx.save();
          // Draw a soft drop shadow for the player photo
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
          
          // Draw photo with a clean gold border
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 4;
          ctx.strokeRect(frameX, frameY, frameSize, frameSize);
          
          // Crop and draw user image inside the frame
          const size = Math.min(userImg.width, userImg.height);
          ctx.drawImage(
            userImg,
            (userImg.width - size) / 2, (userImg.height - size) / 2, size, size,
            frameX + 2, frameY + 2, frameSize - 4, frameSize - 4
          );
          ctx.restore();
          resolve();
        };
        userImg.onerror = resolve;
      });
    }

    // Overlay Details & Parameters
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Outfit", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    
    // Draw Name/Alias
    ctx.fillText(sticker.userAlias.toUpperCase(), w / 2, 410);
    ctx.shadowBlur = 0; // reset shadow

    // Draw Team and Position
    ctx.font = 'bold 15px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${sticker.position} | ${teamName}`, w / 2, 440);

    // Draw Height, Weight, Nationality details panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(40, 470, w - 80, 55);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 470, w - 80, 55);

    ctx.font = '12px "Inter", sans-serif';
    ctx.fillStyle = '#a0aec0';
    ctx.textAlign = 'left';
    ctx.fillText(`ESTATURA: ${sticker.height || 'N/A'}`, 50, 490);
    ctx.fillText(`PESO: ${sticker.weight || 'N/A'}`, 50, 510);

    ctx.textAlign = 'right';
    ctx.fillText(`SELECCIÓN:`, w - 50, 490);
    ctx.fillText(teamName, w - 50, 510);

    // Stats Section at the bottom
    const statsY = 560;
    ctx.font = 'bold 14px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    ctx.fillText(`RIT: ${sticker.stats.ritmo}`, 60, statsY);
    ctx.fillText(`TIR: ${sticker.stats.tiro}`, 60, statsY + 25);
    ctx.fillText(`PAS: ${sticker.stats.pase}`, 60, statsY + 50);

    ctx.fillText(`REG: ${sticker.stats.regate}`, w / 2 + 20, statsY);
    ctx.fillText(`DEF: ${sticker.stats.defensa}`, w / 2 + 20, statsY + 25);
    ctx.fillText(`FIS: ${sticker.stats.fisico}`, w / 2 + 20, statsY + 50);
  }
}
