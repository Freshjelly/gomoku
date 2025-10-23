// Clipboard utilities
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// Generate invite URL
export function generateInviteUrl(roomId: string, token: string): string {
  return `${window.location.origin}/join/${roomId}?t=${token}`;
}

// Parse invite URL
export function parseInviteUrl(url: string): { roomId: string; token: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1];
    const token = urlObj.searchParams.get('t');

    if (roomId && token) {
      return { roomId, token };
    }
  } catch {
    // Invalid URL
  }

  return null;
}
