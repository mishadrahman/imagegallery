const fs = require('fs');
let code = fs.readFileSync('src/services/telegramService.ts', 'utf8');

const targetFunctionStart = code.indexOf('export function resolveImageUrl(');
const targetFunctionEnd = code.indexOf('// Check Telegram Status');

const newFunction = `export function resolveImageUrl(
  image: GalleryImage,
  variant: 'thumb' | 'full' = 'thumb'
): string {
  if (variant === 'thumb') {
    if (image.thumbnailFileId) return \`/api/telegram/image/\${image.thumbnailFileId}\`;
    if (image.thumbnailUrl && !image.thumbnailUrl.includes('api.telegram.org')) return image.thumbnailUrl;
  }
  
  if (image.fileId) return \`/api/telegram/image/\${image.fileId}\`;
  return image.directUrl || '';
}

`;

code = code.substring(0, targetFunctionStart) + newFunction + code.substring(targetFunctionEnd);

fs.writeFileSync('src/services/telegramService.ts', code);
