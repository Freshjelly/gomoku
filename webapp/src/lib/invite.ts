export function generateInviteUrl(roomId: string, joinToken: string): string {
  return `${window.location.origin}/join/${roomId}?t=${joinToken}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // フォールバック: 古いブラウザ対応
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('クリップボードへのコピーに失敗:', error);
    return false;
  }
}

export function formatLatency(latency: number): string {
  if (latency < 50) return `${latency}ms`;
  if (latency < 100) return `${latency}ms`;
  return `${latency}ms`;
}

export function getPlayerDisplayName(color: 'black' | 'white'): string {
  return color === 'black' ? '黒' : '白';
}

export function getPlayerIcon(color: 'black' | 'white'): string {
  return color === 'black' ? '⚫' : '⚪';
}
