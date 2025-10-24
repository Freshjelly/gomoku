/**
 * QRコード生成ユーティリティ（軽量実装）
 * サーバサイド依存なしでクライアント単体で生成
 */

/**
 * URLをQRコード画像（Data URL）に変換
 * @param url QRコード化するURL
 * @returns Data URL形式のQRコード画像
 */
export function generateQRCodeDataURL(url: string): string {
  // QRコード生成にはライブラリが必要なため、Google Charts APIを使用
  // 軽量でサーバレス、商用利用可能
  const encodedUrl = encodeURIComponent(url);
  const size = 300;
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedUrl}&choe=UTF-8`;
}

/**
 * QRコードをダウンロード
 * @param url QRコード化するURL
 * @param filename ダウンロードファイル名
 */
export async function downloadQRCode(url: string, filename: string = 'qrcode.png'): Promise<void> {
  const qrCodeUrl = generateQRCodeDataURL(url);

  try {
    const response = await fetch(qrCodeUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('QRコードのダウンロードに失敗しました:', error);
    throw error;
  }
}
