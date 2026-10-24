# Original Quality Video Share (WhatsApp)

Video upload பண்ணா ஒரு link கிடைக்கும். அத WhatsApp-ல அனுப்பினா thumbnail card தெரியும். Tap பண்ணா original quality video, download button-உம் இருக்கும்.

## Computer-ல ஓட்ட (test)
1. Node.js 18+ install பண்ணுங்க
2. இந்த folder-ல: `npm install` பிறகு `npm start`
3. Browser-ல http://localhost:3000 திறங்க

WhatsApp-ல மற்றவங்களுக்கு தெரிய இது internet-ல இருக்கணும் (கீழ பாருங்க).

## Internet-ல போட (Render.com free)
1. இந்த folder-ஐ GitHub-ல upload பண்ணுங்க
2. render.com → New → Web Service → அந்த repo தேர்ந்தெடுங்க
3. Build: `npm install`, Start: `npm start`
4. Environment variable சேருங்க: `UPLOAD_PASSWORD` = உங்க ரகசிய password (இல்லன்னா யார் வேணும்னாலும் upload பண்ணலாம்)
5. கிடைக்குற URL-ல போய் video upload பண்ணுங்க

குறிப்பு: Render free plan-ல files நிரந்தரமா இருக்காது (restart ஆனா அழியும்). அதுக்கு Render disk அல்லது Railway/VPS பயன்படுத்தலாம். Links 7 நாள்ல தானா அழியும் (`KEEP_DAYS` மூலம் மாத்தலாம்).
